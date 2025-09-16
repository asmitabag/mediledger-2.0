// scripts/test_contracts.js
// Network-aware contract testing with proper network configuration

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

class NetworkAwareContractTester {
  constructor() {
    this.addresses = null;
    this.contracts = {};
    this.signer = null;
    this.network = null;
  }

  async initialize() {
    console.log("MediLedger Contract Tester");
    console.log("==========================\n");

    // Get current network info
    this.network = await ethers.provider.getNetwork();
    console.log(
      `Connected to network: ${this.network.name} (Chain ID: ${this.network.chainId})`
    );

    // Load deployed addresses
    const addressesPath = path.join("deployed", "addresses.json");
    if (!fs.existsSync(addressesPath)) {
      throw new Error("Contract addresses not found. Deploy contracts first.");
    }

    this.addresses = JSON.parse(fs.readFileSync(addressesPath));

    // Check if network matches deployment
    const deployedChainId = this.addresses.chainId;
    const currentChainId = this.network.chainId.toString();

    console.log(`Deployed on chain: ${deployedChainId}`);
    console.log(`Current chain: ${currentChainId}`);

    if (deployedChainId !== currentChainId) {
      console.log("\n⚠️  NETWORK MISMATCH DETECTED");
      console.log(
        `Contracts were deployed on chain ${deployedChainId} but you're connected to chain ${currentChainId}`
      );

      if (deployedChainId === "11155111") {
        console.log("\nTo test Sepolia contracts, you need to:");
        console.log("1. Configure your Hardhat network for Sepolia");
        console.log(
          "2. Or use a different tool like Remix or direct RPC calls"
        );
        console.log("3. Or redeploy on your current network");
        console.log(
          "\nFor now, showing deployment info and suggested next steps..."
        );
      }

      await this.showDeploymentInfo();
      return false;
    }

    console.log("✅ Network matches deployment");

    // Get signer info
    const [signer] = await ethers.getSigners();
    this.signer = signer;

    console.log(`\nUsing account: ${signer.address}`);

    // Check balance
    const balance = await ethers.provider.getBalance(signer.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.log("❌ Account has no balance");
      return false;
    }

    return true;
  }

  async showDeploymentInfo() {
    console.log("\n📋 Deployment Information");
    console.log("=========================");
    console.log(`Network: ${this.addresses.network}`);
    console.log(`Chain ID: ${this.addresses.chainId}`);
    console.log(`Deployed: ${this.addresses.deploymentTimestamp}`);
    console.log(`Deployer: ${this.addresses.deployer}`);
    console.log("");
    console.log("Contract Addresses:");
    console.log(
      `  Verifier (${this.addresses.verifierType}): ${this.addresses.Verifier}`
    );
    console.log(`  MedicalRecord: ${this.addresses.MedicalRecord}`);
    console.log(`  DrugRegistry: ${this.addresses.DrugRegistry}`);

    if (this.addresses.chainId === "11155111") {
      console.log("\n🔗 Sepolia Etherscan Links:");
      const baseUrl = "https://sepolia.etherscan.io";
      console.log(`  Verifier: ${baseUrl}/address/${this.addresses.Verifier}`);
      console.log(
        `  MedicalRecord: ${baseUrl}/address/${this.addresses.MedicalRecord}`
      );
      console.log(
        `  DrugRegistry: ${baseUrl}/address/${this.addresses.DrugRegistry}`
      );

      console.log("\n🔍 Verification Commands:");
      console.log(
        `  npx hardhat verify --network sepolia ${this.addresses.Verifier}`
      );
      console.log(
        `  npx hardhat verify --network sepolia ${this.addresses.MedicalRecord} ${this.addresses.Verifier}`
      );
      console.log(
        `  npx hardhat verify --network sepolia ${this.addresses.DrugRegistry}`
      );
    }
  }

  async connectToContracts() {
    try {
      console.log("\n🔗 Connecting to contracts...");

      // Connect to DrugRegistry
      const DrugRegistry = await ethers.getContractFactory("DrugRegistry");
      this.contracts.drugRegistry = DrugRegistry.attach(
        this.addresses.DrugRegistry
      );

      // Test connection with a simple call
      const code = await ethers.provider.getCode(this.addresses.DrugRegistry);
      if (code === "0x") {
        throw new Error("DrugRegistry contract not found at address");
      }

      console.log("✅ DrugRegistry connected");

      // Connect to MedicalRecord
      const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
      this.contracts.medicalRecord = MedicalRecord.attach(
        this.addresses.MedicalRecord
      );

      // Test connection
      const medicalCode = await ethers.provider.getCode(
        this.addresses.MedicalRecord
      );
      if (medicalCode === "0x") {
        throw new Error("MedicalRecord contract not found at address");
      }

      console.log("✅ MedicalRecord connected");
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to contracts: ${error.message}`);
      return false;
    }
  }

  async testBasicCalls() {
    console.log("\n🧪 Testing basic contract calls...");

    try {
      // Test DrugRegistry
      console.log("Testing DrugRegistry.getAllBatchIds()...");
      const batchIds = await this.contracts.drugRegistry.getAllBatchIds();
      console.log(`✅ DrugRegistry working - ${batchIds.length} batches found`);

      // Test role check
      const DEFAULT_ADMIN_ROLE =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const isAdmin = await this.contracts.drugRegistry.hasRole(
        DEFAULT_ADMIN_ROLE,
        this.signer.address
      );
      console.log(`Admin role: ${isAdmin ? "✅ Yes" : "❌ No"}`);

      // Test MedicalRecord
      console.log("Testing MedicalRecord.getCommitments()...");
      const commitments = await this.contracts.medicalRecord.getCommitments(
        this.signer.address
      );
      console.log(
        `✅ MedicalRecord working - ${commitments.length} commitments found`
      );

      return true;
    } catch (error) {
      console.error(`❌ Basic calls failed: ${error.message}`);
      return false;
    }
  }

  async testDrugRegistryFunctionality() {
    console.log("\n💊 Testing DrugRegistry functionality...");

    try {
      // Check if we have the required role
      const MANUFACTURER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("MANUFACTURER_ROLE")
      );
      const hasManufacturerRole = await this.contracts.drugRegistry.hasRole(
        MANUFACTURER_ROLE,
        this.signer.address
      );

      if (!hasManufacturerRole) {
        console.log("❌ No MANUFACTURER_ROLE - cannot create batches");
        return false;
      }

      console.log("✅ Has MANUFACTURER_ROLE");

      // Create a test batch
      const batchId = ethers.keccak256(
        ethers.toUtf8Bytes(`TEST_BATCH_${Date.now()}`)
      );
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + 365 * 24 * 60 * 60;

      console.log("Creating test batch...");

      // Estimate gas
      const gasEstimate =
        await this.contracts.drugRegistry.registerBatch.estimateGas(
          batchId,
          "Test Drug 100mg",
          now,
          expiry
        );

      console.log(`Gas estimate: ${gasEstimate.toString()}`);

      // Submit transaction
      const tx = await this.contracts.drugRegistry.registerBatch(
        batchId,
        "Test Drug 100mg",
        now,
        expiry
      );

      console.log(`Transaction: ${tx.hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await tx.wait();
      console.log(`✅ Batch created in block ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);

      // Test anomaly logging
      const ML_LOGGER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("ML_LOGGER_ROLE")
      );
      const hasMLRole = await this.contracts.drugRegistry.hasRole(
        ML_LOGGER_ROLE,
        this.signer.address
      );

      if (hasMLRole) {
        console.log("Testing anomaly logging...");

        const predictionData = {
          batchId: batchId,
          anomalyScore: 0.85,
          timestamp: new Date().toISOString(),
        };

        const predictionHash = ethers.keccak256(
          ethers.toUtf8Bytes(JSON.stringify(predictionData))
        );

        const anomalyTx = await this.contracts.drugRegistry.logAnomalyCheck(
          batchId,
          predictionHash,
          "test_anomaly"
        );

        const anomalyReceipt = await anomalyTx.wait();
        console.log(`✅ Anomaly logged in block ${anomalyReceipt.blockNumber}`);
      }

      return { batchId, transactionHash: tx.hash };
    } catch (error) {
      console.error(`❌ DrugRegistry test failed: ${error.message}`);
      return false;
    }
  }

  async runNetworkSpecificTests() {
    const networkName = this.network.name;
    const chainId = this.network.chainId.toString();

    if (chainId === "31337") {
      console.log("\n🏠 Local Hardhat Network Tests");
      console.log("===============================");
      console.log("Running comprehensive local tests...");

      // Local network - can do full testing
      return await this.testDrugRegistryFunctionality();
    } else if (chainId === "11155111") {
      console.log("\n🌐 Sepolia Testnet Tests");
      console.log("========================");
      console.log("Running testnet-appropriate tests...");

      // Testnet - be more careful with gas
      return await this.testDrugRegistryFunctionality();
    } else {
      console.log(`\n❓ Unknown Network (${networkName}, Chain ${chainId})`);
      console.log("Running basic connectivity tests only...");
      return true;
    }
  }

  async run() {
    try {
      const networkReady = await this.initialize();
      if (!networkReady) {
        return false;
      }

      await this.showDeploymentInfo();

      const connected = await this.connectToContracts();
      if (!connected) {
        return false;
      }

      const basicCallsWork = await this.testBasicCalls();
      if (!basicCallsWork) {
        return false;
      }

      const testResults = await this.runNetworkSpecificTests();

      console.log("\n📊 Test Summary");
      console.log("===============");
      console.log(`Network: ${this.network.name} (${this.network.chainId})`);
      console.log(`Contracts: ${connected ? "✅ Connected" : "❌ Failed"}`);
      console.log(
        `Basic calls: ${basicCallsWork ? "✅ Working" : "❌ Failed"}`
      );
      console.log(`Functionality: ${testResults ? "✅ Working" : "❌ Failed"}`);

      return true;
    } catch (error) {
      console.error(`\n❌ Test suite failed: ${error.message}`);
      return false;
    }
  }
}

// Provide network-specific guidance
function showNetworkGuidance() {
  console.log("Network Configuration Guidance");
  console.log("==============================\n");

  console.log("For Sepolia testing:");
  console.log("1. Update hardhat.config.js:");
  console.log("   networks: {");
  console.log("     sepolia: {");
  console.log("       url: process.env.SEPOLIA_URL,");
  console.log("       accounts: [process.env.PRIVATE_KEY]");
  console.log("     }");
  console.log("   }");
  console.log("");
  console.log("2. Run with Sepolia network:");
  console.log("   npx hardhat run scripts/test_contracts.js --network sepolia");
  console.log("");
  console.log("For local testing:");
  console.log("1. Start Hardhat node: npx hardhat node");
  console.log("2. Deploy locally: npm run deploy:local");
  console.log("3. Run tests: node scripts/test_contracts.js");
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "help" || command === "--help") {
    showNetworkGuidance();
    return;
  }

  const tester = new NetworkAwareContractTester();

  try {
    const success = await tester.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { NetworkAwareContractTester };
