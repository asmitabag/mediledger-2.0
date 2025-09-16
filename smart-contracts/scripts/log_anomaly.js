// scripts/log_anomaly.js
// Log ML anomaly detection results to the DrugRegistry contract

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function logAnomaly(
  batchId,
  predictionFilePath,
  anomalyType = "general"
) {
  console.log("MediLedger ML Anomaly Logging");
  console.log("==============================\n");

  // Load contract addresses
  const addressesPath = path.join("deployed", "addresses.json");
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "Contract addresses not found. Please deploy contracts first:\n" +
        "  npm run deploy:local"
    );
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath));
  console.log(`Using DrugRegistry: ${addresses.DrugRegistry}`);

  // Load prediction data
  let predictionData;
  if (fs.existsSync(predictionFilePath)) {
    predictionData = JSON.parse(fs.readFileSync(predictionFilePath));
    console.log(`Prediction file: ${predictionFilePath}`);
  } else {
    // Create sample prediction if file doesn't exist
    console.log("Creating sample ML prediction...");
    predictionData = {
      batchId: batchId,
      timestamp: new Date().toISOString(),
      model: {
        name: "AnomalyDetector-v2.1",
        version: "2024.1",
        accuracy: 0.94,
      },
      prediction: {
        isAnomalous: true,
        anomalyScore: Math.random() * 0.3 + 0.7, // Score between 0.7-1.0
        riskLevel: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
        confidence: Math.random() * 0.2 + 0.8, // Confidence 0.8-1.0
        factors: [
          "temperature_deviation",
          "humidity_anomaly",
          "transport_irregularity",
        ],
      },
      sensorData: {
        temperature: 25.7,
        humidity: 45.2,
        location: "Warehouse B-7",
        deviceId: "SENSOR_001",
      },
      metadata: {
        processingTime: "1.247s",
        dataPoints: 1440,
        algorithm: "ensemble_isolation_forest",
      },
    };

    // Save sample prediction
    const samplePath = path.join("test_data", "sample_prediction.json");
    fs.writeFileSync(samplePath, JSON.stringify(predictionData, null, 2));
    console.log(`Sample prediction saved: ${samplePath}`);
  }

  // Generate prediction hash
  const predictionJson = JSON.stringify(predictionData);
  const predictionHash = ethers.keccak256(ethers.toUtf8Bytes(predictionJson));

  console.log(`Batch ID: ${batchId}`);
  console.log(`Anomaly Type: ${anomalyType}`);
  console.log(`Prediction Hash: ${predictionHash}`);
  console.log(
    `Prediction Score: ${predictionData.prediction?.anomalyScore || "N/A"}`
  );

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`\nLogging with account: ${signer.address}`);

  // Get contract instance
  const DrugRegistry = await ethers.getContractFactory("DrugRegistry");
  const drugRegistry = DrugRegistry.attach(addresses.DrugRegistry);

  // Check if signer has ML_LOGGER_ROLE
  const ML_LOGGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ML_LOGGER_ROLE"));
  const hasRole = await drugRegistry.hasRole(ML_LOGGER_ROLE, signer.address);

  if (!hasRole) {
    console.log("⚠️  Warning: Signer does not have ML_LOGGER_ROLE");
    console.log("   This transaction will likely fail unless role is granted");
  }

  // Convert batchId to bytes32 if it's a string
  let batchIdBytes32;
  if (typeof batchId === "string" && !batchId.startsWith("0x")) {
    batchIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(batchId));
    console.log(`Converted batch ID to bytes32: ${batchIdBytes32}`);
  } else {
    batchIdBytes32 = batchId;
  }

  try {
    // Check if batch exists
    console.log("\nVerifying batch exists...");
    const batchExists = await drugRegistry.batchExists(batchIdBytes32);

    if (!batchExists) {
      console.log("❌ Batch does not exist. Creating test batch...");

      // Check if signer has manufacturer role to create test batch
      const MANUFACTURER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("MANUFACTURER_ROLE")
      );
      const hasManufacturerRole = await drugRegistry.hasRole(
        MANUFACTURER_ROLE,
        signer.address
      );

      if (hasManufacturerRole) {
        const now = Math.floor(Date.now() / 1000);
        const expiryDate = now + 365 * 24 * 60 * 60; // 1 year from now

        await drugRegistry.registerBatch(
          batchIdBytes32,
          "Test Drug for Anomaly Detection",
          now,
          expiryDate
        );
        console.log("✅ Test batch created");
      } else {
        throw new Error(
          "Batch does not exist and account cannot create test batch"
        );
      }
    } else {
      console.log("✅ Batch exists");
    }

    // Estimate gas
    console.log("\nEstimating gas...");
    const gasEstimate = await drugRegistry.logAnomalyCheck.estimateGas(
      batchIdBytes32,
      predictionHash,
      anomalyType
    );
    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    // Submit anomaly log
    console.log("\nSubmitting anomaly log...");
    const tx = await drugRegistry.logAnomalyCheck(
      batchIdBytes32,
      predictionHash,
      anomalyType
    );
    console.log(`Transaction hash: ${tx.hash}`);

    // Wait for confirmation
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`Block number: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Parse events
    const events = receipt.logs.filter((log) => {
      try {
        const parsed = drugRegistry.interface.parseLog(log);
        return parsed && parsed.name === "AnomalyLogged";
      } catch {
        return false;
      }
    });

    if (events.length > 0) {
      const event = drugRegistry.interface.parseLog(events[0]);
      console.log("\n✅ AnomalyLogged event emitted:");
      console.log(`  Batch ID: ${event.args.batchId}`);
      console.log(`  Prediction Hash: ${event.args.predictionHash}`);
      console.log(`  Logger: ${event.args.logger}`);
      console.log(`  Anomaly Type: ${event.args.anomalyType}`);
      console.log(`  Timestamp: ${event.args.timestamp}`);
    }

    // Verify the log was stored
    console.log("\nVerifying storage...");
    const anomalyLogs = await drugRegistry.getAnomalyLogs(batchIdBytes32);
    const logExists = anomalyLogs.some(
      (log) => log.predictionHash === predictionHash
    );

    if (logExists) {
      console.log("✅ Anomaly log successfully stored on-chain");
      console.log(`Total anomaly logs for this batch: ${anomalyLogs.length}`);
    } else {
      console.log("❌ Anomaly log not found in storage");
    }

    // Save transaction record
    const txRecord = {
      batchId: batchIdBytes32,
      predictionFile: predictionFilePath,
      predictionHash: predictionHash,
      anomalyType: anomalyType,
      predictionData: predictionData,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      contractAddress: addresses.DrugRegistry,
      logger: signer.address,
    };

    const recordPath = path.join(
      "proof_data",
      `anomaly_log_${Date.now()}.json`
    );
    fs.writeFileSync(recordPath, JSON.stringify(txRecord, null, 2));
    console.log(`\nTransaction record saved: ${recordPath}`);

    return {
      success: true,
      transactionHash: tx.hash,
      batchId: batchIdBytes32,
      predictionHash: predictionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (error) {
    console.error("\n❌ Anomaly logging failed:");
    console.error(error.message);

    if (error.message.includes("AccessControlUnauthorizedAccount")) {
      console.error("\nSolution: Grant ML_LOGGER_ROLE to your account:");
      console.error(`  1. Get contract admin to run:`);
      console.error(`     await drugRegistry.addMLLogger("${signer.address}")`);
      console.error(`  2. Or use an account that already has the role`);
    } else if (error.message.includes("Batch does not exist")) {
      console.error("\nThe specified batch ID does not exist.");
      console.error("Solutions:");
      console.error("  1. Use an existing batch ID");
      console.error(
        "  2. Register the batch first with a manufacturer account"
      );
      console.error("  3. Check the batch ID format (should be bytes32)");
    }

    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(
      "Usage: node scripts/log_anomaly.js <batch-id> [prediction-file] [anomaly-type]"
    );
    console.log("\nExamples:");
    console.log("  node scripts/log_anomaly.js BATCH_001");
    console.log(
      "  node scripts/log_anomaly.js BATCH_001 predictions/anomaly_result.json temperature_deviation"
    );
    console.log(
      "  node scripts/log_anomaly.js 0x1234...abcd predictions/ml_output.json humidity_anomaly"
    );
    console.log(
      "\nIf prediction-file is not provided, a sample prediction will be created."
    );
    console.log("If anomaly-type is not provided, 'general' will be used.");
    process.exit(1);
  }

  const batchId = args[0];
  const predictionFile = args[1] || "sample_prediction.json";
  const anomalyType = args[2] || "general";

  logAnomaly(batchId, predictionFile, anomalyType)
    .then((result) => {
      console.log("\n🎉 Anomaly logged successfully!");
      console.log(`Transaction: ${result.transactionHash}`);
      console.log(`Batch ID: ${result.batchId}`);
      console.log(`Gas used: ${result.gasUsed}`);
    })
    .catch((error) => {
      console.error("\n💥 Anomaly logging failed");
      process.exit(1);
    });
}

module.exports = { logAnomaly };
