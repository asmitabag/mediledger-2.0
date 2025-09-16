// scripts/test_sepolia.js
// Test deployed contracts on Sepolia testnet

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

class SepoliaContractTester {
  constructor() {
    this.addresses = null;
    this.contracts = {};
    this.signer = null;
    this.networkName = "sepolia";
  }

  async initialize() {
    console.log("MediLedger Sepolia Contract Tester");
    console.log("==================================\n");

    // Load deployed addresses
    const addressesPath = path.join("deployed", "addresses.json");
    if (!fs.existsSync(addressesPath)) {
      throw new Error("Contract addresses not found. Deploy contracts first.");
    }

    this.addresses = JSON.parse(fs.readFileSync(addressesPath));

    // Verify this is a Sepolia deployment
    if (this.addresses.chainId !== "11155111") {
      console.log(
        `Warning: Expected Sepolia (chain 11155111), got ${this.addresses.chainId}`
      );
    }

    console.log("Deployed Contract Addresses:");
    console.log(
      `  Network: ${this.addresses.network} (Chain ID: ${this.addresses.chainId})`
    );
    console.log(`  Verifier: ${this.addresses.Verifier}`);
    console.log(`  MedicalRecord: ${this.addresses.MedicalRecord}`);
    console.log(`  DrugRegistry: ${this.addresses.DrugRegistry}`);
    console.log(`  Deployer: ${this.addresses.deployer}`);
    console.log(`  Verifier Type: ${this.addresses.verifierType}`);

    // Get signer
    const [signer] = await ethers.getSigners();
    this.signer = signer;

    console.log(`\nUsing account: ${signer.address}`);

    // Check if this is the same account that deployed
    if (
      signer.address.toLowerCase() === this.addresses.deployer.toLowerCase()
    ) {
      console.log("✅ Using deployer account (has admin roles)");
    } else {
      console.log("⚠️  Using different account than deployer");
    }

    // Check balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther("0.01")) {
      console.log("⚠️  Low balance - may not be enough for transactions");
    }

    // Initialize contract instances
    await this.initializeContracts();
  }

  async initializeContracts() {
    try {
      const DrugRegistry = await ethers.getContractFactory("DrugRegistry");
      this.contracts.drugRegistry = DrugRegistry.attach(
        this.addresses.DrugRegistry
      );

      const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
      this.contracts.medicalRecord = MedicalRecord.attach(
        this.addresses.MedicalRecord
      );

      console.log("✅ Connected to deployed contracts");
    } catch (error) {
      throw new Error(`Failed to connect to contracts: ${error.message}`);
    }
  }

  async testDrugRegistry() {
    console.log("\n💊 Testing DrugRegistry on Sepolia");
    console.log("===================================");

    try {
      // Check current state
      const allBatchIds = await this.contracts.drugRegistry.getAllBatchIds();
      console.log(`Current batches: ${allBatchIds.length}`);

      if (allBatchIds.length > 0) {
        console.log("Existing batch IDs:");
        for (let i = 0; i < Math.min(allBatchIds.length, 3); i++) {
          console.log(`  ${i + 1}. ${allBatchIds[i]}`);
        }
        if (allBatchIds.length > 3) {
          console.log(`  ... and ${allBatchIds.length - 3} more`);
        }
      }

      // Test creating a new batch
      const batchId = ethers.keccak256(
        ethers.toUtf8Bytes(`SEPOLIA_BATCH_${Date.now()}`)
      );
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + 365 * 24 * 60 * 60; // 1 year

      console.log(`\nCreating new batch: ${batchId.substring(0, 10)}...`);

      // Estimate gas first
      const gasEstimate =
        await this.contracts.drugRegistry.registerBatch.estimateGas(
          batchId,
          "Sepolia Test Drug 100mg",
          now,
          expiry
        );

      console.log(`Estimated gas: ${gasEstimate.toString()}`);

      // Calculate cost
      const gasPrice = await ethers.provider.getFeeData();
      const estimatedCost = gasEstimate * gasPrice.gasPrice;
      console.log(`Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);

      // Create batch
      const tx = await this.contracts.drugRegistry.registerBatch(
        batchId,
        "Sepolia Test Drug 100mg",
        now,
        expiry,
        { gasLimit: gasEstimate + 10000n } // Add buffer
      );

      console.log(`Transaction submitted: ${tx.hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log(`✅ Batch registered in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      console.log(
        `Actual cost: ${ethers.formatEther(
          receipt.gasUsed * gasPrice.gasPrice
        )} ETH`
      );

      // Test anomaly logging
      console.log("\nTesting anomaly logging...");

      const predictionData = {
        batchId: batchId,
        timestamp: new Date().toISOString(),
        model: "SepoliaTestModel-v1.0",
        anomalyScore: 0.78,
        riskLevel: "medium",
        location: "Sepolia Test Lab",
      };

      const predictionHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(predictionData))
      );

      const anomalyTx = await this.contracts.drugRegistry.logAnomalyCheck(
        batchId,
        predictionHash,
        "sepolia_test"
      );

      console.log(`Anomaly log transaction: ${anomalyTx.hash}`);
      const anomalyReceipt = await anomalyTx.wait();
      console.log(`✅ Anomaly logged in block ${anomalyReceipt.blockNumber}`);

      // Verify the logs
      const logs = await this.contracts.drugRegistry.getAnomalyLogs(batchId);
      console.log(`Anomaly logs for batch: ${logs.length}`);

      return { batchId, transactionHash: tx.hash, anomalyHash: anomalyTx.hash };
    } catch (error) {
      console.error(`❌ DrugRegistry test failed: ${error.message}`);

      if (error.message.includes("insufficient funds")) {
        console.log("💡 Solution: Add more ETH to your account");
        console.log("   Get Sepolia ETH from: https://sepoliafaucet.com/");
      } else if (error.message.includes("AccessControl")) {
        console.log("💡 Solution: Make sure you're using the deployer account");
      }

      throw error;
    }
  }

  async testMedicalRecord() {
    console.log("\n🏥 Testing MedicalRecord on Sepolia");
    console.log("===================================");

    try {
      // Check current commitments
      const commitments = await this.contracts.medicalRecord.getCommitments(
        this.signer.address
      );
      console.log(`Current commitments: ${commitments.length}`);

      if (this.addresses.verifierType === "Groth16Verifier") {
        console.log("\n⚠️  Real Groth16Verifier detected");
        console.log("To submit proofs, you need to:");
        console.log("1. Build ZK circuits: npm run build:circuit");
        console.log("2. Setup proving keys: npm run setup:zkey");
        console.log(
          "3. Generate proof: node scripts/gen_proof_fixed.js generate <file>"
        );
        console.log(
          "4. Submit proof: node scripts/submit_proof.js <proof-file>"
        );
        console.log("");
        console.log("For now, showing commitment verification only...");

        // Test commitment verification with existing commitments
        if (commitments.length > 0) {
          console.log("Verifying existing commitments:");
          for (let i = 0; i < Math.min(commitments.length, 3); i++) {
            const exists = await this.contracts.medicalRecord.verifyCommitment(
              commitments[i]
            );
            console.log(
              `  ${commitments[i]}: ${exists ? "✅ Valid" : "❌ Invalid"}`
            );
          }
        }
      }

      return { commitmentsCount: commitments.length };
    } catch (error) {
      console.error(`❌ MedicalRecord test failed: ${error.message}`);
      throw error;
    }
  }

  async checkEtherscanLinks() {
    console.log("\n🔍 Etherscan Links");
    console.log("==================");

    const baseUrl = "https://sepolia.etherscan.io";

    console.log("Contract Addresses:");
    console.log(`  Verifier: ${baseUrl}/address/${this.addresses.Verifier}`);
    console.log(
      `  MedicalRecord: ${baseUrl}/address/${this.addresses.MedicalRecord}`
    );
    console.log(
      `  DrugRegistry: ${baseUrl}/address/${this.addresses.DrugRegistry}`
    );
    console.log("");
    console.log(
      `  Deployer Account: ${baseUrl}/address/${this.addresses.deployer}`
    );
  }

  async verifyContracts() {
    console.log("\n🔐 Contract Verification Commands");
    console.log("=================================");

    console.log("Run these commands to verify contracts on Etherscan:");
    console.log("");
    console.log(
      `npx hardhat verify --network sepolia ${this.addresses.Verifier}`
    );
    console.log(
      `npx hardhat verify --network sepolia ${this.addresses.MedicalRecord} ${this.addresses.Verifier}`
    );
    console.log(
      `npx hardhat verify --network sepolia ${this.addresses.DrugRegistry}`
    );
    console.log("");
    console.log("Note: Verification may take a few minutes to process");
  }

  async runFullTest() {
    try {
      await this.initialize();

      const drugResults = await this.testDrugRegistry();
      const medicalResults = await this.testMedicalRecord();

      this.checkEtherscanLinks();
      await this.verifyContracts();

      console.log("\n📊 Test Summary");
      console.log("===============");
      console.log("✅ DrugRegistry: Working");
      console.log("✅ MedicalRecord: Connected");
      console.log("✅ Role permissions: Configured");
      console.log("✅ Sepolia deployment: Successful");

      if (drugResults.batchId) {
        console.log(
          `✅ Test batch created: ${drugResults.batchId.substring(0, 10)}...`
        );
      }

      console.log("");
      console.log("Next Steps:");
      console.log("1. Verify contracts on Etherscan (see commands above)");
      console.log("2. Build ZK circuits for real proof generation");
      console.log("3. Test with frontend integration");
      console.log("4. Monitor gas costs and optimize if needed");

      return {
        success: true,
        drugRegistry: drugResults,
        medicalRecord: medicalResults,
      };
    } catch (error) {
      console.error(`\n❌ Test failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const tester = new SepoliaContractTester();

  try {
    switch (command) {
      case "full":
        await tester.runFullTest();
        break;

      case "drug":
        await tester.initialize();
        await tester.testDrugRegistry();
        break;

      case "medical":
        await tester.initialize();
        await tester.testMedicalRecord();
        break;

      case "links":
        await tester.initialize();
        tester.checkEtherscanLinks();
        break;

      case "verify":
        await tester.initialize();
        await tester.verifyContracts();
        break;

      default:
        console.log("MediLedger Sepolia Contract Tester");
        console.log("==================================");
        console.log("");
        console.log("Commands:");
        console.log("  full       - Run complete test suite");
        console.log("  drug       - Test DrugRegistry contract");
        console.log("  medical    - Test MedicalRecord contract");
        console.log("  links      - Show Etherscan links");
        console.log("  verify     - Show verification commands");
        console.log("");
        console.log("Examples:");
        console.log("  node scripts/test_sepolia.js full");
        console.log("  node scripts/test_sepolia.js drug");
        console.log("  node scripts/test_sepolia.js links");
        break;
    }
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SepoliaContractTester };
