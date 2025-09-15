#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const snarkjs = require("snarkjs");
const {
  formatProofForSolidity,
  logWithTimestamp,
} = require("./utils/proofUtils");

require("dotenv").config();

/**
 * Submit zero-knowledge proof to MedicalRecord contract
 *
 * Usage: node scripts/submit_proof.js [proof-file] [public-file]
 */
async function submitProof() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const proofFile = args[0] || path.join("proof_data", "proof.json");
    const publicFile = args[1] || path.join("proof_data", "public.json");

    // Validate files exist
    if (!fs.existsSync(proofFile)) {
      throw new Error(`Proof file not found: ${proofFile}`);
    }
    if (!fs.existsSync(publicFile)) {
      throw new Error(`Public signals file not found: ${publicFile}`);
    }

    logWithTimestamp("Starting proof submission...");

    // Load proof and public signals
    const proof = JSON.parse(fs.readFileSync(proofFile));
    const publicSignals = JSON.parse(fs.readFileSync(publicFile));

    logWithTimestamp(`Loaded proof from: ${proofFile}`);
    logWithTimestamp(`Loaded public signals from: ${publicFile}`);

    // Load contract addresses
    const deployedPath = path.join("deployed", "addresses.json");
    if (!fs.existsSync(deployedPath)) {
      throw new Error(
        `Deployed addresses not found: ${deployedPath}. Deploy contracts first.`
      );
    }

    const addresses = JSON.parse(fs.readFileSync(deployedPath));
    logWithTimestamp(`Using contract address: ${addresses.MedicalRecord}`);

    // Set up provider and signer
    const provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || "http://localhost:8545"
    );

    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not found in environment variables");
    }

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    logWithTimestamp(`Using account: ${signer.address}`);

    // Check account balance
    const balance = await provider.getBalance(signer.address);
    logWithTimestamp(`Account balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      throw new Error("Account has no ETH balance for transaction fees");
    }

    // Load contract ABI
    const artifactPath = path.join(
      "artifacts",
      "contracts",
      "MedicalRecord.sol",
      "MedicalRecord.json"
    );
    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Contract artifact not found: ${artifactPath}. Compile contracts first.`
      );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath));

    // Create contract instance
    const contract = new ethers.Contract(
      addresses.MedicalRecord,
      artifact.abi,
      signer
    );

    // Format proof for Solidity
    const solidityProof = formatProofForSolidity(proof, publicSignals);

    logWithTimestamp("Formatted proof for Solidity:");
    console.log(`  a: [${solidityProof.a.join(", ")}]`);
    console.log(
      `  b: [[${solidityProof.b[0].join(", ")}], [${solidityProof.b[1].join(
        ", "
      )}]]`
    );
    console.log(`  c: [${solidityProof.c.join(", ")}]`);
    console.log(`  input: [${solidityProof.input.join(", ")}]`);

    // Estimate gas
    logWithTimestamp("Estimating gas...");
    const gasEstimate = await contract.commitRecord.estimateGas(
      solidityProof.a,
      solidityProof.b,
      solidityProof.c,
      solidityProof.input
    );
    logWithTimestamp(`Estimated gas: ${gasEstimate.toString()}`);

    // Submit transaction
    logWithTimestamp("Submitting proof to contract...");
    const tx = await contract.commitRecord(
      solidityProof.a,
      solidityProof.b,
      solidityProof.c,
      solidityProof.input,
      {
        gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
      }
    );

    logWithTimestamp(`Transaction submitted: ${tx.hash}`);
    logWithTimestamp("Waiting for confirmation...");

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      logWithTimestamp("✅ Transaction confirmed!");

      // Parse events
      const logs = receipt.logs;
      for (const log of logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "RecordCommitted") {
            console.log("\n=== RECORD COMMITTED EVENT ===");
            console.log(`Provider: ${parsedLog.args.provider}`);
            console.log(`Commitment: ${parsedLog.args.commitment}`);
            console.log(
              `Timestamp: ${new Date(
                Number(parsedLog.args.timestamp) * 1000
              ).toISOString()}`
            );
            console.log("===============================\n");
          }
        } catch (e) {
          // Log might not be from our contract
        }
      }

      // Save transaction details
      const txDetails = {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        commitment: publicSignals[0],
        submitter: signer.address,
        timestamp: new Date().toISOString(),
      };

      const txPath = path.join("proof_data", "transaction.json");
      fs.writeFileSync(txPath, JSON.stringify(txDetails, null, 2));
      logWithTimestamp(`Transaction details saved to: ${txPath}`);

      console.log("\n=== SUBMISSION SUMMARY ===");
      console.log(`Transaction Hash: ${tx.hash}`);
      console.log(`Block Number: ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Commitment: ${publicSignals[0]}`);
      console.log(`Contract Address: ${addresses.MedicalRecord}`);
      console.log("===========================\n");
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error) {
    if (error.code === "CALL_EXCEPTION") {
      console.error(
        `❌ Contract call failed: ${error.reason || error.message}`
      );
      if (error.data) {
        console.error(`Error data: ${error.data}`);
      }
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      console.error("❌ Insufficient funds for transaction");
    } else {
      console.error(`❌ Error submitting proof: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  submitProof()
    .then(() => {
      logWithTimestamp("Proof submission completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { submitProof };
