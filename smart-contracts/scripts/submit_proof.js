// scripts/submit_proof.js
// Submit a generated proof to the MedicalRecord contract

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function submitProof(proofFilePath, contractAddresses = null) {
  console.log("MediLedger Proof Submission");
  console.log("============================\n");

  // Load proof data
  if (!fs.existsSync(proofFilePath)) {
    throw new Error(`Proof file not found: ${proofFilePath}`);
  }

  const proofData = JSON.parse(fs.readFileSync(proofFilePath));
  console.log(`Proof file: ${proofFilePath}`);
  console.log(`Original file: ${proofData.filePath}`);
  console.log(`Commitment: ${proofData.commitment}`);

  // Get contract addresses
  let addresses = contractAddresses;
  if (!addresses) {
    const addressesPath = path.join("deployed", "addresses.json");
    if (!fs.existsSync(addressesPath)) {
      throw new Error(
        "Contract addresses not found. Please deploy contracts first:\n" +
          "  npm run deploy:local"
      );
    }
    addresses = JSON.parse(fs.readFileSync(addressesPath));
  }

  console.log(`\nUsing deployed contracts:`);
  console.log(`  MedicalRecord: ${addresses.MedicalRecord}`);
  console.log(`  Verifier: ${addresses.Verifier} (${addresses.verifierType})`);

  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`\nSubmitting with account: ${signer.address}`);

  // Get contract instance
  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = MedicalRecord.attach(addresses.MedicalRecord);

  // Check if signer has healthcare provider role
  const HEALTHCARE_PROVIDER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("HEALTHCARE_PROVIDER_ROLE")
  );

  const hasRole = await medicalRecord.hasRole(
    HEALTHCARE_PROVIDER_ROLE,
    signer.address
  );
  if (!hasRole) {
    console.log("⚠️  Warning: Signer does not have HEALTHCARE_PROVIDER_ROLE");
    console.log("   This transaction will likely fail unless role is granted");
  }

  // Prepare proof parameters
  const { a, b, c, input } = proofData.proof;

  console.log("\nProof parameters:");
  console.log(`  a: [${a.join(", ")}]`);
  console.log(`  b: [[${b[0].join(", ")}], [${b[1].join(", ")}]]`);
  console.log(`  c: [${c.join(", ")}]`);
  console.log(`  input: [${input.join(", ")}]`);

  try {
    // Estimate gas
    console.log("\nEstimating gas...");
    const gasEstimate = await medicalRecord.commitRecord.estimateGas(
      a,
      b,
      c,
      input
    );
    console.log(`  Estimated gas: ${gasEstimate.toString()}`);

    // Submit transaction
    console.log("\nSubmitting proof to blockchain...");
    const tx = await medicalRecord.commitRecord(a, b, c, input);
    console.log(`  Transaction hash: ${tx.hash}`);

    // Wait for confirmation
    console.log("  Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`  Block number: ${receipt.blockNumber}`);
    console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

    // Parse events
    const events = receipt.logs.filter((log) => {
      try {
        const parsed = medicalRecord.interface.parseLog(log);
        return parsed && parsed.name === "RecordCommitted";
      } catch {
        return false;
      }
    });

    if (events.length > 0) {
      const event = medicalRecord.interface.parseLog(events[0]);
      console.log("\n✅ RecordCommitted event emitted:");
      console.log(`  Provider: ${event.args.provider}`);
      console.log(`  Commitment: ${event.args.commitment}`);
      console.log(`  Timestamp: ${event.args.timestamp}`);
    }

    // Verify the commitment was stored
    console.log("\nVerifying storage...");
    const commitments = await medicalRecord.getCommitments(signer.address);
    const expectedCommitment = ethers.zeroPadValue(
      ethers.toBeHex(proofData.commitment),
      32
    );

    const commitmentExists = commitments.some((c) => c === expectedCommitment);
    if (commitmentExists) {
      console.log("✅ Commitment successfully stored on-chain");
    } else {
      console.log("❌ Commitment not found in storage");
    }

    // Save transaction record
    const txRecord = {
      proofFile: proofFilePath,
      originalFile: proofData.filePath,
      commitment: proofData.commitment,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      contractAddress: addresses.MedicalRecord,
      submitter: signer.address,
    };

    const txRecordPath = path.join("proof_data", `tx_${Date.now()}.json`);
    fs.writeFileSync(txRecordPath, JSON.stringify(txRecord, null, 2));
    console.log(`\nTransaction record saved: ${txRecordPath}`);

    return {
      success: true,
      transactionHash: tx.hash,
      commitment: proofData.commitment,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("\n❌ Proof submission failed:");
    console.error(error.message);

    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      console.error(
        "\nSolution: Grant HEALTHCARE_PROVIDER_ROLE to your account:"
      );
      console.error(`  1. Get contract admin to run:`);
      console.error(
        `     await medicalRecord.addHealthcareProvider("${signer.address}")`
      );
      console.error(`  2. Or use an account that already has the role`);
    } else if (error.message.includes("Invalid zero-knowledge proof")) {
      console.error("\nThe zero-knowledge proof verification failed.");
      console.error("This could be due to:");
      console.error("  - Incorrect proof generation");
      console.error("  - Mismatched circuit and verifier");
      console.error("  - Corrupted proof data");
    } else if (error.message.includes("Commitment already exists")) {
      console.error("\nThis commitment has already been submitted.");
      console.error("Each unique file can only be committed once.");
    }

    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node scripts/submit_proof.js <proof-file-path>");
    console.log("\nExample:");
    console.log(
      "  node scripts/submit_proof.js proof_data/proof_1638123456789.json"
    );
    console.log("\nOr generate and submit in one step:");
    console.log("  node scripts/gen_proof.js test_data/sample.json");
    console.log("  node scripts/submit_proof.js proof_data/proof_*.json");
    process.exit(1);
  }

  submitProof(args[0])
    .then((result) => {
      console.log("\n🎉 Proof submitted successfully!");
      console.log(`Transaction: ${result.transactionHash}`);
      console.log(`Commitment: ${result.commitment}`);
      console.log(`Gas used: ${result.gasUsed}`);
    })
    .catch((error) => {
      console.error("\n💥 Proof submission failed");
      process.exit(1);
    });
}

module.exports = { submitProof };
