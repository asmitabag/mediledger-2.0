#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const snarkjs = require("snarkjs");
const {
  computeFileHash,
  hashToField,
  generateSalt,
  createWitnessInput,
  ensureDirectoryExists,
  logWithTimestamp,
} = require("./utils/proofUtils");

/**
 * Generate zero-knowledge proof for medical record commitment
 *
 * Usage: node scripts/gen_proof.js <file-path> [salt]
 */
async function generateProof() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.error("Usage: node scripts/gen_proof.js <file-path> [salt]");
      console.error("  file-path: Path to the encrypted medical record file");
      console.error(
        "  salt: Optional salt (will generate random if not provided)"
      );
      process.exit(1);
    }

    const filePath = args[0];
    const providedSalt = args[1];

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    logWithTimestamp(`Starting proof generation for file: ${filePath}`);

    // Ensure output directories exist
    ensureDirectoryExists("proof_data");
    ensureDirectoryExists("circom_build");

    // Step 1: Compute SHA256 hash of the file
    logWithTimestamp("Computing SHA256 hash...");
    const fileHash = computeFileHash(filePath);
    logWithTimestamp(`File SHA256: ${fileHash}`);

    // Step 2: Convert hash to field element
    const preimage = hashToField(fileHash);
    logWithTimestamp(`Preimage (field element): ${preimage}`);

    // Step 3: Generate or use provided salt
    const salt = providedSalt || generateSalt();
    logWithTimestamp(`Salt: ${salt}`);

    // Step 4: Create witness input
    const input = createWitnessInput(preimage, salt);

    // Save input for debugging
    const inputPath = path.join("proof_data", "input.json");
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
    logWithTimestamp(`Saved input to: ${inputPath}`);

    // Step 5: Generate witness
    logWithTimestamp("Generating witness...");
    const wasmPath = path.join("circom_build", "commitment.wasm");
    const r1csPath = path.join("circom_build", "commitment.r1cs");

    // Validate circuit files exist
    if (!fs.existsSync(wasmPath)) {
      throw new Error(
        `Circuit WASM not found: ${wasmPath}. Run 'npm run build:circuit' first.`
      );
    }

    const { witness } = await snarkjs.wtns.calculate(input, wasmPath);

    // Step 6: Generate proof
    logWithTimestamp("Generating zero-knowledge proof...");
    const zkeyPath = path.join("zkeys", "commitment_final.zkey");

    if (!fs.existsSync(zkeyPath)) {
      throw new Error(
        `Proving key not found: ${zkeyPath}. Run 'npm run setup:zkey' first.`
      );
    }

    const { proof, publicSignals } = await snarkjs.groth16.prove(
      zkeyPath,
      witness
    );

    // Step 7: Save proof and public signals
    const proofPath = path.join("proof_data", "proof.json");
    const publicPath = path.join("proof_data", "public.json");

    fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));

    logWithTimestamp(`Proof saved to: ${proofPath}`);
    logWithTimestamp(`Public signals saved to: ${publicPath}`);

    // Step 8: Verify proof locally
    logWithTimestamp("Verifying proof locally...");
    const vkeyPath = path.join("zkeys", "commitment_final.json");

    let vKey;
    if (fs.existsSync(vkeyPath)) {
      vKey = JSON.parse(fs.readFileSync(vkeyPath));
    } else {
      // Extract verification key from zkey
      vKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
      fs.writeFileSync(vkeyPath, JSON.stringify(vKey, null, 2));
    }

    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    if (isValid) {
      logWithTimestamp("✅ Proof verification successful!");
    } else {
      throw new Error("❌ Proof verification failed!");
    }

    // Step 9: Display summary
    console.log("\n=== PROOF GENERATION SUMMARY ===");
    console.log(`File: ${filePath}`);
    console.log(`SHA256: ${fileHash}`);
    console.log(`Preimage: ${preimage}`);
    console.log(`Salt: ${salt}`);
    console.log(`Commitment: ${publicSignals[0]}`);
    console.log(`Proof file: ${proofPath}`);
    console.log(`Public signals file: ${publicPath}`);
    console.log("=================================\n");

    // Save metadata for submit script
    const metadata = {
      originalFile: filePath,
      fileHash: fileHash,
      preimage: preimage,
      salt: salt,
      commitment: publicSignals[0],
      timestamp: new Date().toISOString(),
      proofPath: proofPath,
      publicPath: publicPath,
    };

    const metadataPath = path.join("proof_data", "metadata.json");
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    logWithTimestamp(`Metadata saved to: ${metadataPath}`);

    return {
      proof,
      publicSignals,
      metadata,
    };
  } catch (error) {
    console.error(`❌ Error generating proof: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateProof()
    .then(() => {
      logWithTimestamp("Proof generation completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { generateProof };
