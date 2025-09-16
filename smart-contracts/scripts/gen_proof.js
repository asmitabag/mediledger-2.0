// scripts/gen_proof_fixed.js
// Fixed version of proof generation with better error handling

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("hardhat");

// Import snarkjs with error handling
let snarkjs;
try {
  snarkjs = require("snarkjs");
} catch (error) {
  console.error("❌ snarkjs not installed. Install with: npm install snarkjs");
  process.exit(1);
}

/**
 * Utility functions
 */
function computeFileHash(filePath) {
  const fileData = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileData).digest("hex");
}

function hashToField(hashHex) {
  // Convert hex hash to BigInt and reduce modulo the BN254 field prime
  const fieldPrime = BigInt(
    "21888242871839275222246405745257275088548364400416034343698204186575808495617"
  );
  const hashBigInt = BigInt("0x" + hashHex);
  return (hashBigInt % fieldPrime).toString();
}

function generateSalt() {
  // Generate random 32-byte salt and convert to field element
  const saltBytes = crypto.randomBytes(32);
  const saltHex = saltBytes.toString("hex");
  return hashToField(saltHex);
}

function formatProofForSolidity(proof, publicSignals) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: publicSignals,
  };
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if we can use real ZK proofs or need to create mock proofs
 */
function checkZKAvailability() {
  const wasmPath = path.join("circom_build", "commitment.wasm");
  const zkeyPath = path.join("zkeys", "commitment_final.zkey");

  const wasmExists = fs.existsSync(wasmPath);
  const zkeyExists = fs.existsSync(zkeyPath);

  return {
    available: wasmExists && zkeyExists,
    wasmPath,
    zkeyPath,
    missing: {
      wasm: !wasmExists,
      zkey: !zkeyExists,
    },
  };
}

/**
 * Generate a mock proof for testing purposes
 */
function generateMockProof(filePath) {
  console.log("🎭 Generating mock proof (for testing only)");

  const fileHash = computeFileHash(filePath);
  const preimage = hashToField(fileHash);
  const salt = generateSalt();

  // Create deterministic but fake proof based on file content
  const mockCommitment = hashToField(
    crypto
      .createHash("sha256")
      .update(preimage + salt)
      .digest("hex")
  );

  console.log(`   File hash: ${fileHash}`);
  console.log(`   Mock commitment: ${mockCommitment}`);

  return {
    filePath: filePath,
    fileHash: fileHash,
    preimage: preimage,
    salt: salt,
    commitment: mockCommitment,
    proof: {
      a: [1, 2],
      b: [
        [1, 2],
        [3, 4],
      ],
      c: [5, 6],
      input: [mockCommitment],
    },
    timestamp: new Date().toISOString(),
    isMock: true,
  };
}

/**
 * Generate real ZK proof using snarkjs
 */
async function generateRealProof(filePath, zkAvailability) {
  console.log("⚡ Generating real zero-knowledge proof");

  const fileHash = computeFileHash(filePath);
  const preimage = hashToField(fileHash);
  const salt = generateSalt();

  console.log(`   File hash: ${fileHash}`);
  console.log(`   Preimage (field): ${preimage}`);
  console.log(`   Salt: ${salt.substring(0, 16)}...`);

  // Prepare circuit input
  const input = {
    preimage: preimage,
    salt: salt,
  };

  console.log("   Calculating witness...");

  let witnessBuffer;
  try {
    // Try different methods to calculate witness
    if (typeof snarkjs.wtns.calculate === "function") {
      witnessBuffer = await snarkjs.wtns.calculate(
        input,
        zkAvailability.wasmPath,
        {
          logLevel: "silent",
        }
      );
    } else {
      // Fallback method for older snarkjs versions
      const witnessCalculator = require(path.join(
        process.cwd(),
        "circom_build",
        "commitment_js",
        "witness_calculator.js"
      ));
      const wc = await witnessCalculator(
        path.join(process.cwd(), zkAvailability.wasmPath)
      );
      witnessBuffer = await wc.calculateWitness(input, 0);
    }
  } catch (error) {
    console.error(`   ❌ Witness calculation failed: ${error.message}`);
    throw new Error(
      `Witness calculation failed. This might be due to:\n` +
        `1. Incorrect circuit input format\n` +
        `2. Corrupted WASM file\n` +
        `3. snarkjs version incompatibility\n` +
        `Original error: ${error.message}`
    );
  }

  console.log("   Generating proof...");

  let result;
  try {
    result = await snarkjs.groth16.prove(
      zkAvailability.zkeyPath,
      witnessBuffer
    );
  } catch (error) {
    console.error(`   ❌ Proof generation failed: ${error.message}`);
    throw new Error(
      `Proof generation failed. This might be due to:\n` +
        `1. Corrupted zkey file\n` +
        `2. Witness/key mismatch\n` +
        `3. Insufficient memory\n` +
        `Original error: ${error.message}`
    );
  }

  const { proof, publicSignals } = result;
  const solidityProof = formatProofForSolidity(proof, publicSignals);

  console.log("   ✅ Proof generated successfully!");
  console.log(`   Commitment: ${publicSignals[0]}`);

  return {
    filePath: filePath,
    fileHash: fileHash,
    preimage: preimage,
    salt: salt,
    commitment: publicSignals[0],
    proof: {
      a: solidityProof.a,
      b: solidityProof.b,
      c: solidityProof.c,
      input: solidityProof.input,
    },
    timestamp: new Date().toISOString(),
    isMock: false,
  };
}

/**
 * Main proof generation function
 */
async function generateProof(filePath, forceMock = false) {
  console.log("MediLedger Proof Generation (Fixed)");
  console.log("====================================\n");

  // Validate input file
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log(`Input file: ${filePath}`);
  const fileStats = fs.statSync(filePath);
  console.log(`File size: ${fileStats.size} bytes`);

  // Check ZK availability
  const zkAvailability = checkZKAvailability();

  console.log("\nZK Circuit Status:");
  console.log(
    `   WASM file: ${zkAvailability.available ? "✅ Found" : "❌ Missing"} - ${
      zkAvailability.wasmPath
    }`
  );
  console.log(
    `   zkey file: ${zkAvailability.available ? "✅ Found" : "❌ Missing"} - ${
      zkAvailability.zkeyPath
    }`
  );

  let proofData;

  if (forceMock || !zkAvailability.available) {
    if (!zkAvailability.available) {
      console.log("\n⚠️  ZK circuit files not found, using mock proof");
      if (zkAvailability.missing.wasm) {
        console.log("   Missing: commitment.wasm (run: npm run build:circuit)");
      }
      if (zkAvailability.missing.zkey) {
        console.log(
          "   Missing: commitment_final.zkey (run: npm run setup:zkey)"
        );
      }
    }
    proofData = generateMockProof(filePath);
  } else {
    try {
      proofData = await generateRealProof(filePath, zkAvailability);
    } catch (error) {
      console.error(`\n❌ Real proof generation failed: ${error.message}`);
      console.log("\nFalling back to mock proof...");
      proofData = generateMockProof(filePath);
    }
  }

  // Save proof data
  ensureDirectoryExists("proof_data");

  const proofFileName = `proof_${Date.now()}.json`;
  const proofFilePath = path.join("proof_data", proofFileName);

  fs.writeFileSync(proofFilePath, JSON.stringify(proofData, null, 2));
  console.log(`\nProof saved to: ${proofFilePath}`);

  if (proofData.isMock) {
    console.log("\n⚠️  WARNING: This is a MOCK proof for testing only!");
    console.log("   It will only work with MockVerifier contracts");
    console.log("   For production, build real ZK circuits first:");
    console.log("   1. npm run build:circuit");
    console.log("   2. npm run setup:zkey");
    console.log("   3. Re-run this script");
  }

  return proofData;
}

/**
 * Verify a proof file can be loaded and has correct format
 */
function verifyProofFile(proofFilePath) {
  if (!fs.existsSync(proofFilePath)) {
    throw new Error(`Proof file not found: ${proofFilePath}`);
  }

  try {
    const proofData = JSON.parse(fs.readFileSync(proofFilePath));

    const requiredFields = [
      "filePath",
      "fileHash",
      "commitment",
      "proof",
      "timestamp",
    ];
    const missingFields = requiredFields.filter((field) => !proofData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Proof file missing fields: ${missingFields.join(", ")}`);
    }

    const requiredProofFields = ["a", "b", "c", "input"];
    const missingProofFields = requiredProofFields.filter(
      (field) => !proofData.proof[field]
    );

    if (missingProofFields.length > 0) {
      throw new Error(
        `Proof object missing fields: ${missingProofFields.join(", ")}`
      );
    }

    console.log(`✅ Proof file format verified: ${proofFilePath}`);
    console.log(`   Original file: ${proofData.filePath}`);
    console.log(`   Commitment: ${proofData.commitment}`);
    console.log(`   Mock proof: ${proofData.isMock || false}`);

    return proofData;
  } catch (error) {
    throw new Error(`Invalid proof file format: ${error.message}`);
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "generate":
      case "gen":
        if (args.length < 2) {
          console.log(
            "Usage: node scripts/gen_proof_fixed.js generate <file-path> [--mock]"
          );
          console.log("\nExamples:");
          console.log(
            "  node scripts/gen_proof_fixed.js generate test_data/sample.json"
          );
          console.log(
            "  node scripts/gen_proof_fixed.js generate test_data/sample.json --mock"
          );
          process.exit(1);
        }

        const filePath = args[1];
        const forceMock = args.includes("--mock");

        const proofData = await generateProof(filePath, forceMock);

        console.log("\n✅ Proof generation completed!");
        console.log(`Commitment: ${proofData.commitment}`);
        console.log(
          `Type: ${proofData.isMock ? "Mock (testing)" : "Real ZK proof"}`
        );

        if (proofData.isMock) {
          console.log("\nNext step: Test with mock verifier:");
          console.log("  node scripts/submit_proof.js proof_data/proof_*.json");
        } else {
          console.log("\nNext step: Submit to blockchain:");
          console.log("  node scripts/submit_proof.js proof_data/proof_*.json");
        }
        break;

      case "verify":
        if (args.length < 2) {
          console.log(
            "Usage: node scripts/gen_proof_fixed.js verify <proof-file>"
          );
          process.exit(1);
        }

        verifyProofFile(args[1]);
        break;

      case "test":
        // Create test data and generate proof
        console.log("Running end-to-end proof test...\n");

        // Create test file
        ensureDirectoryExists("test_data");
        const testFilePath = path.join("test_data", "proof_test.json");
        const testData = {
          patientId: "TEST_PATIENT_001",
          timestamp: new Date().toISOString(),
          diagnosis: "Test diagnosis for proof generation",
          testRun: true,
        };

        fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2));
        console.log(`Created test file: ${testFilePath}`);

        // Generate proof
        const testProofData = await generateProof(testFilePath);

        // Verify proof file
        const proofFiles = fs
          .readdirSync("proof_data")
          .filter((f) => f.startsWith("proof_"));
        const latestProofFile = path.join(
          "proof_data",
          proofFiles[proofFiles.length - 1]
        );

        verifyProofFile(latestProofFile);

        console.log("\n✅ End-to-end test completed successfully!");
        break;

      default:
        console.log("MediLedger Proof Generation (Fixed Version)");
        console.log("============================================");
        console.log("");
        console.log(
          "This script generates zero-knowledge proofs for medical records."
        );
        console.log(
          "It automatically detects if ZK circuit files are available and"
        );
        console.log("falls back to mock proofs for testing if they're not.");
        console.log("");
        console.log("Commands:");
        console.log("  generate <file> [--mock]  - Generate proof for file");
        console.log("  verify <proof-file>       - Verify proof file format");
        console.log("  test                      - Run end-to-end test");
        console.log("");
        console.log("Examples:");
        console.log(
          "  node scripts/gen_proof_fixed.js generate test_data/sample.json"
        );
        console.log(
          "  node scripts/gen_proof_fixed.js generate test_data/sample.json --mock"
        );
        console.log(
          "  node scripts/gen_proof_fixed.js verify proof_data/proof_123456.json"
        );
        console.log("  node scripts/gen_proof_fixed.js test");
        console.log("");
        console.log("Required for real ZK proofs (automatically detected):");
        console.log("  - circom_build/commitment.wasm");
        console.log("  - zkeys/commitment_final.zkey");
        console.log("");
        console.log("To build these files:");
        console.log("  1. npm install -g circom");
        console.log("  2. npm run build:circuit");
        console.log("  3. npm run setup:zkey");
        break;
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateProof,
  generateMockProof,
  verifyProofFile,
  checkZKAvailability,
};
