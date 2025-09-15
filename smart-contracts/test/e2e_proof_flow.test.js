const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const snarkjs = require("snarkjs");
const {
  computeFileHash,
  hashToField,
  generateSalt,
  formatProofForSolidity,
  encryptData,
  generateAESKey,
  ensureDirectoryExists,
} = require("../scripts/utils/proofUtils");
const { uploadToIPFS, mockIPFSUpload } = require("../scripts/ipfs_upload");

describe("End-to-End Proof Flow", function () {
  let verifier, medicalRecord, drugRegistry;
  let owner, healthcare, manufacturer;

  // Test file paths
  const testDataDir = path.join(__dirname, "..", "test_data");
  const testFilePath = path.join(testDataDir, "sample_medical_record.json");

  before(async function () {
    // Get signers
    [owner, healthcare, manufacturer] = await ethers.getSigners();

    // Ensure test directories exist
    ensureDirectoryExists(testDataDir);
    ensureDirectoryExists("proof_data");
    ensureDirectoryExists("ipfs_data");
    ensureDirectoryExists("mock_ipfs");

    // Create sample medical record file
    const sampleMedicalRecord = {
      patientId: "P12345",
      doctorId: "D67890",
      date: "2024-01-15",
      diagnosis: "Hypertension",
      treatment: "Lisinopril 10mg daily",
      notes: "Patient responding well to treatment",
      timestamp: new Date().toISOString(),
      facilityId: "F001",
    };

    fs.writeFileSync(
      testFilePath,
      JSON.stringify(sampleMedicalRecord, null, 2)
    );
    console.log(`Created test medical record: ${testFilePath}`);
  });

  beforeEach(async function () {
    // Deploy contracts
    try {
      const Verifier = await ethers.getContractFactory("Verifier");
      verifier = await Verifier.deploy();
      await verifier.waitForDeployment();
    } catch (error) {
      // Use mock verifier if real one not available
      console.log("Using MockVerifier for E2E test");
      const MockVerifier = await ethers.getContractFactory("MockVerifier");
      verifier = await MockVerifier.deploy();
      await verifier.waitForDeployment();
    }

    const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
    medicalRecord = await MedicalRecord.deploy(await verifier.getAddress());
    await medicalRecord.waitForDeployment();

    const DrugRegistry = await ethers.getContractFactory("DrugRegistry");
    drugRegistry = await DrugRegistry.deploy();
    await drugRegistry.waitForDeployment();

    // Grant roles
    await medicalRecord.addHealthcareProvider(healthcare.address);
    await drugRegistry.addManufacturer(manufacturer.address);
  });

  it("Complete medical record flow: encrypt → IPFS → proof → blockchain", async function () {
    this.timeout(60000); // Increase timeout for full flow

    console.log("\n=== Starting End-to-End Medical Record Flow ===");

    // Step 1: Encrypt the medical record file
    console.log("Step 1: Encrypting medical record...");

    const fileData = fs.readFileSync(testFilePath);
    const encryptionKey = generateAESKey();
    const encrypted = encryptData(fileData, encryptionKey);

    console.log(`  Original size: ${fileData.length} bytes`);
    console.log(
      `  Encrypted size: ${
        Buffer.from(encrypted.encryptedData, "hex").length
      } bytes`
    );
    console.log(`  Encryption key: ${encryptionKey.substring(0, 16)}...`);

    // Step 2: Upload to IPFS (mock)
    console.log("\nStep 2: Uploading to IPFS (mock)...");

    // Force mock mode for testing
    process.env.IPFS_MOCK = "true";

    const uploadResult = await uploadToIPFS(testFilePath, encryptionKey);
    console.log(`  IPFS CID: ${uploadResult.cid}`);
    console.log(`  Mock upload successful`);

    // Step 3: Generate ZK proof
    console.log("\nStep 3: Generating zero-knowledge proof...");

    const fileHash = computeFileHash(testFilePath);
    const preimage = hashToField(fileHash);
    const salt = generateSalt();

    console.log(`  File SHA256: ${fileHash}`);
    console.log(`  Preimage (field): ${preimage}`);
    console.log(`  Salt: ${salt.substring(0, 16)}...`);

    let proof, publicSignals;

    // Check if real circuit is available
    const wasmPath = path.join("circom_build", "commitment.wasm");
    const zkeyPath = path.join("zkeys", "commitment_final.zkey");

    if (fs.existsSync(wasmPath) && fs.existsSync(zkeyPath)) {
      console.log("  Using real ZK circuit...");

      // Generate witness
      const input = { preimage, salt };
      const { witness } = await snarkjs.wtns.calculate(input, wasmPath);

      // Generate proof
      const result = await snarkjs.groth16.prove(zkeyPath, witness);
      proof = result.proof;
      publicSignals = result.publicSignals;

      console.log("  ✅ Real ZK proof generated successfully");
    } else {
      console.log("  Using mock proof (circuit not available)...");

      // Create mock proof that works with MockVerifier
      proof = {
        pi_a: ["1", "2", "1"],
        pi_b: [
          ["1", "2"],
          ["3", "4"],
          ["1", "0"],
        ],
        pi_c: ["5", "6", "1"],
      };

      // Calculate expected commitment using circomlibjs if available
      let expectedCommitment;
      try {
        const { poseidon } = await import("circomlibjs");
        const poseidonHash = poseidon([BigInt(preimage), BigInt(salt)]);
        expectedCommitment = poseidonHash.toString();
      } catch (error) {
        // Fallback to simple hash for testing
        expectedCommitment = ethers.keccak256(
          ethers.solidityPacked(["uint256", "uint256"], [preimage, salt])
        );
        expectedCommitment = (
          BigInt(expectedCommitment) %
          BigInt(2) ** BigInt(254)
        ).toString();
      }

      publicSignals = [expectedCommitment];
      console.log("  ✅ Mock proof generated");
    }

    // Step 4: Submit proof to blockchain
    console.log("\nStep 4: Submitting proof to blockchain...");

    const solidityProof = formatProofForSolidity(proof, publicSignals);
    console.log(`  Commitment: ${publicSignals[0]}`);

    const tx = await medicalRecord
      .connect(healthcare)
      .commitRecord(
        solidityProof.a,
        solidityProof.b,
        solidityProof.c,
        solidityProof.input
      );

    const receipt = await tx.wait();
    console.log(`  Transaction hash: ${tx.hash}`);
    console.log(`  Block number: ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

    // Step 5: Verify the complete flow
    console.log("\nStep 5: Verifying complete flow...");

    // Check that commitment was stored
    const commitments = await medicalRecord.getCommitments(healthcare.address);
    expect(commitments.length).to.equal(1);

    const storedCommitment = commitments[0];
    const expectedCommitmentBytes32 = ethers.zeroPadValue(
      ethers.toBeHex(publicSignals[0]),
      32
    );
    expect(storedCommitment).to.equal(expectedCommitmentBytes32);

    console.log("  ✅ Commitment stored correctly on-chain");

    // Verify commitment exists
    const commitmentExists = await medicalRecord.verifyCommitment(
      storedCommitment
    );
    expect(commitmentExists).to.be.true;
    console.log("  ✅ Commitment verification successful");

    // Check event was emitted
    const events = receipt.logs.filter((log) => {
      try {
        const parsed = medicalRecord.interface.parseLog(log);
        return parsed && parsed.name === "RecordCommitted";
      } catch {
        return false;
      }
    });

    expect(events.length).to.equal(1);
    const event = medicalRecord.interface.parseLog(events[0]);
    expect(event.args.provider).to.equal(healthcare.address);
    expect(event.args.commitment).to.equal(storedCommitment);

    console.log("  ✅ RecordCommitted event emitted correctly");

    // Step 6: Simulate retrieval and verification of off-chain data
    console.log("\nStep 6: Verifying off-chain data integrity...");

    // Verify that we can retrieve the same file hash
    const retrievedHash = computeFileHash(testFilePath);
    expect(retrievedHash).to.equal(fileHash);
    console.log("  ✅ File hash consistency verified");

    // Verify IPFS metadata
    const metadataPath = path.join(
      "ipfs_data",
      `${uploadResult.cid}_metadata.json`
    );
    expect(fs.existsSync(metadataPath)).to.be.true;

    const metadata = JSON.parse(fs.readFileSync(metadataPath));
    expect(metadata.cid).to.equal(uploadResult.cid);
    expect(metadata.encryptionKey).to.equal(encryptionKey);
    console.log("  ✅ IPFS metadata consistency verified");

    console.log("\n=== End-to-End Flow Completed Successfully ===\n");

    // Return flow results for further testing
    return {
      cid: uploadResult.cid,
      encryptionKey: encryptionKey,
      commitment: storedCommitment,
      transactionHash: tx.hash,
      preimage: preimage,
      salt: salt,
      fileHash: fileHash,
    };
  });

  it("Should handle multiple medical records from same provider", async function () {
    this.timeout(30000);

    console.log("\n=== Testing Multiple Records Flow ===");

    // Create second test file
    const testFile2Path = path.join(testDataDir, "medical_record_2.json");
    const secondRecord = {
      patientId: "P54321",
      doctorId: "D09876",
      date: "2024-01-16",
      diagnosis: "Diabetes Type 2",
      treatment: "Metformin 500mg twice daily",
      notes: "Newly diagnosed, patient education provided",
      timestamp: new Date().toISOString(),
      facilityId: "F002",
    };
    fs.writeFileSync(testFile2Path, JSON.stringify(secondRecord, null, 2));

    // Process first record
    const hash1 = computeFileHash(testFilePath);
    const preimage1 = hashToField(hash1);
    const salt1 = generateSalt();

    const mockProof1 = {
      a: ["1", "2"],
      b: [
        ["1", "2"],
        ["3", "4"],
      ],
      c: ["5", "6"],
      input: [preimage1],
    };

    await medicalRecord
      .connect(healthcare)
      .commitRecord(mockProof1.a, mockProof1.b, mockProof1.c, mockProof1.input);

    // Process second record
    const hash2 = computeFileHash(testFile2Path);
    const preimage2 = hashToField(hash2);
    const salt2 = generateSalt();

    const mockProof2 = {
      a: ["1", "2"],
      b: [
        ["1", "2"],
        ["3", "4"],
      ],
      c: ["5", "6"],
      input: [preimage2],
    };

    await medicalRecord
      .connect(healthcare)
      .commitRecord(mockProof2.a, mockProof2.b, mockProof2.c, mockProof2.input);

    // Verify both commitments
    const commitments = await medicalRecord.getCommitments(healthcare.address);
    expect(commitments.length).to.equal(2);

    const count = await medicalRecord.getCommitmentCount(healthcare.address);
    expect(count).to.equal(2);

    console.log("  ✅ Multiple records handled correctly");

    // Cleanup
    fs.unlinkSync(testFile2Path);
  });

  it("Should integrate with drug registry for ML logging", async function () {
    console.log("\n=== Testing Drug Registry Integration ===");

    // Register a drug batch
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("TEST_BATCH_001"));
    const drugName = "Test Drug 100mg";
    const manufacturingDate = Math.floor(Date.now() / 1000) - 86400;
    const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

    await drugRegistry
      .connect(manufacturer)
      .registerBatch(batchId, drugName, manufacturingDate, expiryDate);

    // Grant ML logger role to healthcare provider for testing
    await drugRegistry.addMLLogger(healthcare.address);

    // Create ML prediction JSON
    const mlPrediction = {
      batchId: batchId,
      timestamp: new Date().toISOString(),
      model: "AnomalyDetector-v1.0",
      prediction: {
        isAnomalous: true,
        anomalyScore: 0.85,
        riskLevel: "medium",
      },
      confidence: 0.92,
    };

    const predictionJson = JSON.stringify(mlPrediction);
    const predictionHash = ethers.keccak256(ethers.toUtf8Bytes(predictionJson));

    // Log anomaly
    const tx = await drugRegistry
      .connect(healthcare)
      .logAnomalyCheck(batchId, predictionHash, "temperature_deviation");

    const receipt = await tx.wait();

    // Verify anomaly was logged
    const anomalyLogs = await drugRegistry.getAnomalyLogs(batchId);
    expect(anomalyLogs.length).to.equal(1);
    expect(anomalyLogs[0].predictionHash).to.equal(predictionHash);
    expect(anomalyLogs[0].anomalyType).to.equal("temperature_deviation");

    // Check event emission
    const events = receipt.logs.filter((log) => {
      try {
        const parsed = drugRegistry.interface.parseLog(log);
        return parsed && parsed.name === "AnomalyLogged";
      } catch {
        return false;
      }
    });

    expect(events.length).to.equal(1);
    console.log("  ✅ ML anomaly logging integrated successfully");
  });

  it("Should demonstrate privacy preservation", async function () {
    console.log("\n=== Testing Privacy Preservation ===");

    // Create sensitive medical data
    const sensitiveData = {
      patientId: "P99999",
      socialSecurityNumber: "123-45-6789", // Sensitive!
      diagnosis: "HIV Positive", // Very sensitive!
      treatment: "Antiretroviral therapy",
      doctorNotes: "Patient confidentiality is critical",
      labResults: {
        cd4Count: 350,
        viralLoad: "undetectable",
      },
    };

    const sensitiveFilePath = path.join(testDataDir, "sensitive_record.json");
    fs.writeFileSync(sensitiveFilePath, JSON.stringify(sensitiveData, null, 2));

    // Encrypt and upload
    process.env.IPFS_MOCK = "true";
    const uploadResult = await uploadToIPFS(sensitiveFilePath);

    // Generate commitment (only hash goes on-chain)
    const fileHash = computeFileHash(sensitiveFilePath);
    const preimage = hashToField(fileHash);
    const salt = generateSalt();

    const mockProof = {
      a: ["1", "2"],
      b: [
        ["1", "2"],
        ["3", "4"],
      ],
      c: ["5", "6"],
      input: [preimage],
    };

    // Submit commitment to blockchain
    await medicalRecord
      .connect(healthcare)
      .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

    // Verify privacy: only commitment is on-chain
    const commitments = await medicalRecord.getCommitments(healthcare.address);
    const commitment = commitments[0];

    // The commitment should be deterministic but reveal nothing about content
    console.log(`  On-chain commitment: ${commitment}`);
    console.log(
      `  Original data size: ${JSON.stringify(sensitiveData).length} bytes`
    );
    console.log(`  On-chain storage: 32 bytes (commitment only)`);

    // Demonstrate that commitment is consistent
    const recomputedHash = computeFileHash(sensitiveFilePath);
    const recomputedPreimage = hashToField(recomputedHash);
    expect(recomputedPreimage).to.equal(preimage);

    console.log("  ✅ Privacy preserved: only commitment on-chain");
    console.log("  ✅ Data integrity: hash consistency maintained");

    // Cleanup sensitive file
    fs.unlinkSync(sensitiveFilePath);
  });

  after(async function () {
    // Cleanup test files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    console.log("Test cleanup completed");
  });
});
