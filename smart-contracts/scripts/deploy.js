const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy MediLedger contracts to Ethereum network
 * Automatically falls back to MockVerifier if real Verifier is not available
 */
async function main() {
  console.log("Starting MediLedger contract deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer account has no ETH balance");
  }

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("");

  // Step 1: Deploy Verifier contract (with fallback to MockVerifier)
  console.log("1. Deploying Verifier contract...");

  let verifier,
    verifierAddress,
    isUsingMockVerifier = false;

  // Try to deploy the auto-generated verifier contracts in order of preference
  const verifierNames = ["Groth16Verifier", "Verifier", "PlonkVerifier"];
  let deployedVerifierName = null;

  for (const contractName of verifierNames) {
    try {
      console.log(`   Attempting to deploy ${contractName}...`);
      const VerifierContract = await ethers.getContractFactory(contractName);
      verifier = await VerifierContract.deploy();
      await verifier.waitForDeployment();
      verifierAddress = await verifier.getAddress();
      deployedVerifierName = contractName;
      console.log(`✅ Real ${contractName} deployed to:`, verifierAddress);
      break;
    } catch (error) {
      console.log(`   ${contractName} not available: ${error.message}`);
      continue;
    }
  }

  // If no real verifier was deployed, fall back to MockVerifier
  if (!deployedVerifierName) {
    console.log(
      "   No real verifier contracts found, using MockVerifier for development..."
    );
    isUsingMockVerifier = true;
  }

  // Deploy MockVerifier if needed
  if (isUsingMockVerifier) {
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    verifier = await MockVerifier.deploy();
    await verifier.waitForDeployment();
    verifierAddress = await verifier.getAddress();
    console.log("✅ MockVerifier deployed to:", verifierAddress);
    console.log(
      "   ⚠️  WARNING: Using MockVerifier - NOT suitable for production!"
    );
  }

  // Step 2: Deploy MedicalRecord contract
  console.log("\n2. Deploying MedicalRecord contract...");

  const MedicalRecord = await ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy(verifierAddress);
  await medicalRecord.waitForDeployment();

  const medicalRecordAddress = await medicalRecord.getAddress();
  console.log("✅ MedicalRecord deployed to:", medicalRecordAddress);

  // Step 3: Deploy DrugRegistry contract
  console.log("\n3. Deploying DrugRegistry contract...");

  const DrugRegistry = await ethers.getContractFactory("DrugRegistry");
  const drugRegistry = await DrugRegistry.deploy();
  await drugRegistry.waitForDeployment();

  const drugRegistryAddress = await drugRegistry.getAddress();
  console.log("✅ DrugRegistry deployed to:", drugRegistryAddress);

  // Step 4: Set up roles
  console.log("\n4. Setting up roles...");

  // Grant HEALTHCARE_PROVIDER_ROLE to deployer for testing
  const HEALTHCARE_PROVIDER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("HEALTHCARE_PROVIDER_ROLE")
  );
  await medicalRecord.addHealthcareProvider(deployer.address);
  console.log("✅ Granted HEALTHCARE_PROVIDER_ROLE to deployer");

  // Grant roles in DrugRegistry to deployer for testing
  await drugRegistry.addManufacturer(deployer.address);
  console.log("✅ Granted MANUFACTURER_ROLE to deployer");

  await drugRegistry.addDistributor(deployer.address);
  console.log("✅ Granted DISTRIBUTOR_ROLE to deployer");

  await drugRegistry.addMLLogger(deployer.address);
  console.log("✅ Granted ML_LOGGER_ROLE to deployer");

  // Step 5: Verify deployments
  console.log("\n5. Verifying deployments...");

  // Check Verifier
  const code1 = await ethers.provider.getCode(verifierAddress);
  if (code1 === "0x") throw new Error("Verifier deployment failed");
  console.log("✅ Verifier deployment verified");

  // Check MedicalRecord
  const code2 = await ethers.provider.getCode(medicalRecordAddress);
  if (code2 === "0x") throw new Error("MedicalRecord deployment failed");
  console.log("✅ MedicalRecord deployment verified");

  // Check DrugRegistry
  const code3 = await ethers.provider.getCode(drugRegistryAddress);
  if (code3 === "0x") throw new Error("DrugRegistry deployment failed");
  console.log("✅ DrugRegistry deployment verified");

  // Step 6: Save deployment addresses and ABIs
  console.log("\n6. Saving deployment information...");

  const deployedDir = path.join(__dirname, "..", "deployed");
  if (!fs.existsSync(deployedDir)) {
    fs.mkdirSync(deployedDir, { recursive: true });
  }

  // Save addresses
  const addresses = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deploymentTimestamp: new Date().toISOString(),
    verifierType: isUsingMockVerifier ? "MockVerifier" : deployedVerifierName,
    Verifier: verifierAddress,
    MedicalRecord: medicalRecordAddress,
    DrugRegistry: drugRegistryAddress,
    warnings: isUsingMockVerifier
      ? ["Using MockVerifier - NOT suitable for production"]
      : [],
  };

  const addressesPath = path.join(deployedDir, "addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("✅ Addresses saved to:", addressesPath);

  // Copy ABIs from artifacts
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");

  // Copy Verifier ABI (handle both real and mock verifier)
  const verifierContractName = isUsingMockVerifier
    ? "MockVerifier"
    : deployedVerifierName;

  // Try multiple possible artifact paths for auto-generated verifiers
  const possibleVerifierPaths = [
    path.join(
      artifactsDir,
      `${deployedVerifierName}.sol`,
      `${deployedVerifierName}.json`
    ),
    path.join(artifactsDir, "MockVerifier.sol", "MockVerifier.json"),
    path.join(
      __dirname,
      "..",
      "artifacts",
      `${deployedVerifierName}.sol`,
      `${deployedVerifierName}.json`
    ),
    path.join(
      __dirname,
      "..",
      "artifacts",
      "contracts",
      `${deployedVerifierName}.sol`,
      `${deployedVerifierName}.json`
    ),
  ];

  let verifierArtifactFound = false;

  for (const artifactPath of possibleVerifierPaths) {
    if (fs.existsSync(artifactPath)) {
      try {
        const verifierArtifact = JSON.parse(fs.readFileSync(artifactPath));
        fs.writeFileSync(
          path.join(deployedDir, "Verifier.json"),
          JSON.stringify(
            {
              address: verifierAddress,
              type: verifierContractName,
              abi: verifierArtifact.abi,
            },
            null,
            2
          )
        );
        verifierArtifactFound = true;
        break;
      } catch (error) {
        console.log(
          `   Could not read artifact from ${artifactPath}: ${error.message}`
        );
      }
    }
  }

  if (!verifierArtifactFound) {
    console.log("⚠️  Could not find verifier artifact, creating minimal ABI");
    // Create a minimal ABI for the verifier
    const minimalVerifierABI = [
      {
        inputs: [
          {
            internalType: "uint256[2]",
            name: "_pA",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[2][2]",
            name: "_pB",
            type: "uint256[2][2]",
          },
          {
            internalType: "uint256[2]",
            name: "_pC",
            type: "uint256[2]",
          },
          {
            internalType: "uint256[1]",
            name: "_pubSignals",
            type: "uint256[1]",
          },
        ],
        name: "verifyProof",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];

    fs.writeFileSync(
      path.join(deployedDir, "Verifier.json"),
      JSON.stringify(
        {
          address: verifierAddress,
          type: verifierContractName,
          abi: minimalVerifierABI,
        },
        null,
        2
      )
    );
  }

  // Copy MedicalRecord ABI
  const medicalRecordArtifactPath = path.join(
    artifactsDir,
    "MedicalRecord.sol",
    "MedicalRecord.json"
  );
  if (fs.existsSync(medicalRecordArtifactPath)) {
    const medicalRecordArtifact = JSON.parse(
      fs.readFileSync(medicalRecordArtifactPath)
    );
    fs.writeFileSync(
      path.join(deployedDir, "MedicalRecord.json"),
      JSON.stringify(
        {
          address: medicalRecordAddress,
          abi: medicalRecordArtifact.abi,
        },
        null,
        2
      )
    );
  }

  // Copy DrugRegistry ABI
  const drugRegistryArtifactPath = path.join(
    artifactsDir,
    "DrugRegistry.sol",
    "DrugRegistry.json"
  );
  if (fs.existsSync(drugRegistryArtifactPath)) {
    const drugRegistryArtifact = JSON.parse(
      fs.readFileSync(drugRegistryArtifactPath)
    );
    fs.writeFileSync(
      path.join(deployedDir, "DrugRegistry.json"),
      JSON.stringify(
        {
          address: drugRegistryAddress,
          abi: drugRegistryArtifact.abi,
        },
        null,
        2
      )
    );
  }

  console.log("✅ ABIs saved to deployed/ directory");

  // Step 7: Test basic functionality
  console.log("\n7. Testing basic functionality...");

  try {
    // Test DrugRegistry - register a test batch
    const testBatchId = ethers.keccak256(ethers.toUtf8Bytes("TEST_BATCH_001"));
    const manufacturingDate = Math.floor(Date.now() / 1000);
    const expiryDate = manufacturingDate + 365 * 24 * 60 * 60; // 1 year

    const tx1 = await drugRegistry.registerBatch(
      testBatchId,
      "Test Drug 100mg",
      manufacturingDate,
      expiryDate
    );
    await tx1.wait();
    console.log("✅ Test batch registration successful");

    // Test MedicalRecord - attempt to commit a record (will use mock proof)
    if (isUsingMockVerifier) {
      const mockProof = {
        a: [1, 2],
        b: [
          [1, 2],
          [3, 4],
        ],
        c: [5, 6],
        input: [123456789],
      };

      const tx2 = await medicalRecord.commitRecord(
        mockProof.a,
        mockProof.b,
        mockProof.c,
        mockProof.input
      );
      await tx2.wait();
      console.log("✅ Test record commitment successful (using mock proof)");
    } else {
      console.log(
        "⏭️  Skipping proof test - would require real ZK proof generation"
      );
    }
  } catch (error) {
    console.log("⚠️  Basic functionality test failed:", error.message);
  }

  // Step 8: Estimate gas costs
  console.log("\n8. Gas cost estimates (for reference):");

  try {
    // Mock proof data for estimation
    const mockA = [1, 2];
    const mockB = [
      [1, 2],
      [3, 4],
    ];
    const mockC = [5, 6];
    const mockInput = [123];

    const gasEstimate = await medicalRecord.commitRecord
      .estimateGas(mockA, mockB, mockC, mockInput)
      .catch(() => BigInt(150000)); // Lower fallback for mock verifier

    console.log(
      "   Proof verification + commitment:",
      gasEstimate.toString(),
      "gas"
    );

    // Rough cost calculation (using 20 gwei gas price)
    const gasPriceGwei = 20n;
    const costWei = gasEstimate * gasPriceGwei * 1000000000n;
    const costEth = ethers.formatEther(costWei);
    console.log("   Estimated cost at 20 gwei:", costEth, "ETH");
  } catch (error) {
    console.log("   Could not estimate verification gas cost");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 MediLedger Deployment Complete!");
  console.log("=".repeat(60));
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("Contract Addresses:");
  console.log(
    "  Verifier:      ",
    verifierAddress,
    `(${isUsingMockVerifier ? "MockVerifier" : deployedVerifierName})`
  );
  console.log("  MedicalRecord: ", medicalRecordAddress);
  console.log("  DrugRegistry:  ", drugRegistryAddress);
  console.log("");

  if (isUsingMockVerifier) {
    console.log("⚠️  IMPORTANT WARNINGS:");
    console.log("   - Using MockVerifier (always returns true for proofs)");
    console.log("   - This deployment is for DEVELOPMENT/TESTING only");
    console.log("   - Do NOT use in production without real ZK verifier");
    console.log("");
    console.log("To deploy with real ZK verifier:");
    console.log("   1. Run: npm run build:circuit");
    console.log("   2. Run: npm run setup:zkey");
    console.log("   3. Re-run deployment script");
    console.log("");
  }

  console.log("Configuration saved to: deployed/");
  console.log("");

  if (network.name === "sepolia" && !isUsingMockVerifier) {
    console.log("Etherscan verification commands:");
    console.log(`  npx hardhat verify --network sepolia ${verifierAddress}`);
    console.log(
      `  npx hardhat verify --network sepolia ${medicalRecordAddress} ${verifierAddress}`
    );
    console.log(
      `  npx hardhat verify --network sepolia ${drugRegistryAddress}`
    );
    console.log("");
  }

  console.log("Next steps:");
  if (isUsingMockVerifier) {
    console.log("1. For production: Build real ZK circuits first");
    console.log("2. Test with mock proofs: node scripts/test_mock_proof.js");
  } else {
    console.log(
      "1. Test proof generation: node scripts/gen_proof.js <test-file>"
    );
    console.log("2. Test proof submission: node scripts/submit_proof.js");
  }
  console.log(
    "3. Test ML logging: node scripts/log_anomaly.js <batch-id> <prediction-file>"
  );
  console.log("4. Update .env with deployed addresses if needed");
  console.log("=".repeat(60));

  return {
    verifier: verifierAddress,
    verifierType: verifierContractName,
    medicalRecord: medicalRecordAddress,
    drugRegistry: drugRegistryAddress,
    isUsingMockVerifier: isUsingMockVerifier,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((result) => {
    console.log("\nDeployment completed successfully!");
    if (result.isUsingMockVerifier) {
      console.log(
        "⚠️  Remember: This is a development deployment with MockVerifier"
      );
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
