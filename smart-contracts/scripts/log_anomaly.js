#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");
const { logWithTimestamp } = require("./utils/proofUtils");

require("dotenv").config();

/**
 * Log ML anomaly detection result to DrugRegistry contract
 *
 * Usage: node scripts/log_anomaly.js <batch-id> <prediction-json-file> [anomaly-type]
 */
async function logAnomaly() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
      console.error(
        "Usage: node scripts/log_anomaly.js <batch-id> <prediction-json-file> [anomaly-type]"
      );
      console.error("  batch-id: Drug batch identifier (hex string)");
      console.error("  prediction-json-file: Path to ML prediction JSON file");
      console.error("  anomaly-type: Type of anomaly detected (optional)");
      process.exit(1);
    }

    const batchIdInput = args[0];
    const predictionFile = args[1];
    const anomalyType = args[2] || "general";

    // Validate batch ID format
    let batchId;
    if (batchIdInput.startsWith("0x")) {
      batchId = batchIdInput;
    } else {
      // Convert string to bytes32
      batchId = ethers.keccak256(ethers.toUtf8Bytes(batchIdInput));
    }

    logWithTimestamp(`Processing anomaly log for batch: ${batchId}`);

    // Validate prediction file exists
    if (!fs.existsSync(predictionFile)) {
      throw new Error(`Prediction file not found: ${predictionFile}`);
    }

    // Load and validate prediction JSON
    const predictionContent = fs.readFileSync(predictionFile, "utf8");
    let predictionData;

    try {
      predictionData = JSON.parse(predictionContent);
    } catch (error) {
      throw new Error(`Invalid JSON in prediction file: ${error.message}`);
    }

    logWithTimestamp(`Loaded prediction data from: ${predictionFile}`);

    // Validate prediction data structure
    const requiredFields = [
      "batchId",
      "timestamp",
      "model",
      "prediction",
      "confidence",
    ];
    for (const field of requiredFields) {
      if (!(field in predictionData)) {
        console.warn(`Warning: Missing field '${field}' in prediction data`);
      }
    }

    // Display prediction summary
    console.log("\n=== ML PREDICTION SUMMARY ===");
    console.log(`Batch ID: ${predictionData.batchId || batchIdInput}`);
    console.log(`Model: ${predictionData.model || "unknown"}`);
    console.log(
      `Prediction: ${JSON.stringify(predictionData.prediction || "unknown")}`
    );
    console.log(`Confidence: ${predictionData.confidence || "unknown"}`);
    console.log(`Timestamp: ${predictionData.timestamp || "unknown"}`);
    console.log(`Anomaly Type: ${anomalyType}`);
    console.log("==============================\n");

    // Compute keccak256 hash of prediction JSON
    const predictionHash = ethers.keccak256(
      ethers.toUtf8Bytes(predictionContent)
    );
    logWithTimestamp(`Computed prediction hash: ${predictionHash}`);

    // Load contract addresses
    const deployedPath = path.join("deployed", "addresses.json");
    if (!fs.existsSync(deployedPath)) {
      throw new Error(
        `Deployed addresses not found: ${deployedPath}. Deploy contracts first.`
      );
    }

    const addresses = JSON.parse(fs.readFileSync(deployedPath));
    logWithTimestamp(`Using DrugRegistry contract: ${addresses.DrugRegistry}`);

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
      "DrugRegistry.sol",
      "DrugRegistry.json"
    );
    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Contract artifact not found: ${artifactPath}. Compile contracts first.`
      );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath));

    // Create contract instance
    const contract = new ethers.Contract(
      addresses.DrugRegistry,
      artifact.abi,
      signer
    );

    // Check if account has ML_LOGGER_ROLE
    const ML_LOGGER_ROLE = ethers.keccak256(
      ethers.toUtf8Bytes("ML_LOGGER_ROLE")
    );
    const hasRole = await contract.hasRole(ML_LOGGER_ROLE, signer.address);

    if (!hasRole) {
      logWithTimestamp(
        "⚠️  Account does not have ML_LOGGER_ROLE. Requesting admin to grant role..."
      );
      console.log(
        `To grant role, admin should call: contract.addMLLogger("${signer.address}")`
      );
      throw new Error("Account lacks ML_LOGGER_ROLE permission");
    }

    logWithTimestamp("✅ Account has ML_LOGGER_ROLE permission");

    // Check if batch exists
    const batchExists = await contract.batchExists(batchId);
    if (!batchExists) {
      logWithTimestamp(
        "⚠️  Batch ID not found in registry. Creating sample batch..."
      );

      // Check if account has MANUFACTURER_ROLE to create batch
      const MANUFACTURER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("MANUFACTURER_ROLE")
      );
      const hasManufacturerRole = await contract.hasRole(
        MANUFACTURER_ROLE,
        signer.address
      );

      if (hasManufacturerRole) {
        const now = Math.floor(Date.now() / 1000);
        const futureExpiry = now + 365 * 24 * 60 * 60; // 1 year from now

        const registerTx = await contract.registerBatch(
          batchId,
          `Sample Drug for ${batchIdInput}`,
          now,
          futureExpiry
        );

        await registerTx.wait();
        logWithTimestamp(`✅ Created sample batch: ${batchId}`);
      } else {
        throw new Error(
          `Batch ${batchId} does not exist and account cannot create it`
        );
      }
    }

    // Estimate gas for anomaly logging
    logWithTimestamp("Estimating gas for anomaly logging...");
    const gasEstimate = await contract.logAnomalyCheck.estimateGas(
      batchId,
      predictionHash,
      anomalyType
    );
    logWithTimestamp(`Estimated gas: ${gasEstimate.toString()}`);

    // Submit anomaly log transaction
    logWithTimestamp("Submitting anomaly log to contract...");
    const tx = await contract.logAnomalyCheck(
      batchId,
      predictionHash,
      anomalyType,
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
          if (parsedLog && parsedLog.name === "AnomalyLogged") {
            console.log("\n=== ANOMALY LOGGED EVENT ===");
            console.log(`Batch ID: ${parsedLog.args.batchId}`);
            console.log(`Prediction Hash: ${parsedLog.args.predictionHash}`);
            console.log(`Logger: ${parsedLog.args.logger}`);
            console.log(`Anomaly Type: ${parsedLog.args.anomalyType}`);
            console.log(
              `Timestamp: ${new Date(
                Number(parsedLog.args.timestamp) * 1000
              ).toISOString()}`
            );
            console.log("=============================\n");
          }
        } catch (e) {
          // Log might not be from our contract
        }
      }

      // Save anomaly log details
      const anomalyLogDetails = {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        batchId: batchId,
        predictionHash: predictionHash,
        anomalyType: anomalyType,
        logger: signer.address,
        predictionFile: predictionFile,
        predictionData: predictionData,
        timestamp: new Date().toISOString(),
      };

      const logDir = path.join("anomaly_logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logPath = path.join(logDir, `anomaly_${tx.hash}.json`);
      fs.writeFileSync(logPath, JSON.stringify(anomalyLogDetails, null, 2));
      logWithTimestamp(`Anomaly log details saved to: ${logPath}`);

      console.log("\n=== ANOMALY LOGGING SUMMARY ===");
      console.log(`Transaction Hash: ${tx.hash}`);
      console.log(`Block Number: ${receipt.blockNumber}`);
      console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`Batch ID: ${batchId}`);
      console.log(`Prediction Hash: ${predictionHash}`);
      console.log(`Anomaly Type: ${anomalyType}`);
      console.log(`Contract Address: ${addresses.DrugRegistry}`);
      console.log("================================\n");
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
      console.error(`❌ Error logging anomaly: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * Generate sample ML prediction JSON for testing
 * @param {string} batchId - Batch identifier
 * @param {string} outputPath - Output file path
 */
function generateSamplePrediction(batchId, outputPath) {
  const samplePrediction = {
    batchId: batchId,
    timestamp: new Date().toISOString(),
    model: "DrugAnomalyDetector-v1.2.0",
    modelVersion: "1.2.0",
    prediction: {
      isAnomalous: true,
      anomalyScore: 0.87,
      anomalyTypes: ["temperature_deviation", "packaging_integrity"],
      riskLevel: "high",
    },
    confidence: 0.92,
    features: {
      temperature_history: [2.1, 2.3, 8.7, 2.2], // Spike at index 2
      humidity_levels: [45.2, 44.8, 46.1, 45.0],
      packaging_score: 0.73,
      transport_duration_hours: 48.5,
    },
    metadata: {
      processing_time_ms: 234,
      data_quality_score: 0.94,
      sensor_readings_count: 1247,
    },
    recommendations: [
      "Investigate temperature spike at timestamp 2024-01-15T14:32:00Z",
      "Inspect packaging integrity",
      "Consider batch quarantine pending investigation",
    ],
  };

  fs.writeFileSync(outputPath, JSON.stringify(samplePrediction, null, 2));
  logWithTimestamp(`Sample prediction generated: ${outputPath}`);
  return samplePrediction;
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("MediLedger ML Anomaly Logging Tool");
    console.log("");
    console.log("Usage:");
    console.log(
      "  node scripts/log_anomaly.js <batch-id> <prediction-json-file> [anomaly-type]"
    );
    console.log(
      "  node scripts/log_anomaly.js generate <batch-id> <output-file>"
    );
    console.log("");
    console.log("Commands:");
    console.log("  generate - Generate sample ML prediction JSON for testing");
    console.log("");
    console.log("Examples:");
    console.log(
      "  node scripts/log_anomaly.js BATCH001 prediction.json temperature_deviation"
    );
    console.log(
      "  node scripts/log_anomaly.js generate BATCH001 sample_prediction.json"
    );
    console.log("");
    return;
  }

  if (args[0] === "generate") {
    if (args.length < 3) {
      console.error(
        "Usage: node scripts/log_anomaly.js generate <batch-id> <output-file>"
      );
      process.exit(1);
    }
    generateSamplePrediction(args[1], args[2]);
    return;
  }

  await logAnomaly();
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      logWithTimestamp("Anomaly logging completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Fatal error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { logAnomaly, generateSamplePrediction };
