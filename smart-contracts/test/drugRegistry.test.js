const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DrugRegistry Contract", function () {
  let DrugRegistry, drugRegistry;
  let owner, manufacturer, distributor, mlLogger, unauthorized;

  // Test batch data
  const testBatchId = ethers.keccak256(ethers.toUtf8Bytes("BATCH001"));
  const testDrugName = "Aspirin 100mg";
  const manufacturingDate = Math.floor(Date.now() / 1000) - 86400; // Yesterday
  const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

  beforeEach(async function () {
    // Get signers
    [owner, manufacturer, distributor, mlLogger, unauthorized] =
      await ethers.getSigners();

    // Deploy DrugRegistry contract
    DrugRegistry = await ethers.getContractFactory("DrugRegistry");
    drugRegistry = await DrugRegistry.deploy();
    await drugRegistry.waitForDeployment();

    // Grant roles
    await drugRegistry.addManufacturer(manufacturer.address);
    await drugRegistry.addDistributor(distributor.address);
    await drugRegistry.addMLLogger(mlLogger.address);
  });

  describe("Deployment", function () {
    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await drugRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to
        .be.true;
    });

    it("Should not grant other roles to deployer by default", async function () {
      const MANUFACTURER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("MANUFACTURER_ROLE")
      );
      const DISTRIBUTOR_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")
      );
      const ML_LOGGER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("ML_LOGGER_ROLE")
      );

      expect(await drugRegistry.hasRole(MANUFACTURER_ROLE, owner.address)).to.be
        .false;
      expect(await drugRegistry.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be
        .false;
      expect(await drugRegistry.hasRole(ML_LOGGER_ROLE, owner.address)).to.be
        .false;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant manufacturer role", async function () {
      const newManufacturer = unauthorized.address;
      await drugRegistry.addManufacturer(newManufacturer);

      const MANUFACTURER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("MANUFACTURER_ROLE")
      );
      expect(await drugRegistry.hasRole(MANUFACTURER_ROLE, newManufacturer)).to
        .be.true;
    });

    it("Should allow admin to grant distributor role", async function () {
      const newDistributor = unauthorized.address;
      await drugRegistry.addDistributor(newDistributor);

      const DISTRIBUTOR_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")
      );
      expect(await drugRegistry.hasRole(DISTRIBUTOR_ROLE, newDistributor)).to.be
        .true;
    });

    it("Should allow admin to grant ML logger role", async function () {
      const newMLLogger = unauthorized.address;
      await drugRegistry.addMLLogger(newMLLogger);

      const ML_LOGGER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("ML_LOGGER_ROLE")
      );
      expect(await drugRegistry.hasRole(ML_LOGGER_ROLE, newMLLogger)).to.be
        .true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        drugRegistry.connect(unauthorized).addManufacturer(unauthorized.address)
      ).to.be.revertedWithCustomError(
        drugRegistry,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Batch Registration", function () {
    it("Should allow manufacturer to register batch", async function () {
      const tx = await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      // Check event emission
      await expect(tx)
        .to.emit(drugRegistry, "BatchRegistered")
        .withArgs(
          testBatchId,
          manufacturer.address,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      // Check batch exists
      expect(await drugRegistry.batchExists(testBatchId)).to.be.true;

      // Check batch info
      const batchInfo = await drugRegistry.getBatchInfo(testBatchId);
      expect(batchInfo.batchId).to.equal(testBatchId);
      expect(batchInfo.manufacturer).to.equal(manufacturer.address);
      expect(batchInfo.drugName).to.equal(testDrugName);
      expect(batchInfo.manufacturingDate).to.equal(manufacturingDate);
      expect(batchInfo.expiryDate).to.equal(expiryDate);
      expect(batchInfo.isActive).to.be.true;
      expect(batchInfo.currentOwner).to.equal(manufacturer.address);
    });

    it("Should not allow non-manufacturer to register batch", async function () {
      await expect(
        drugRegistry
          .connect(unauthorized)
          .registerBatch(
            testBatchId,
            testDrugName,
            manufacturingDate,
            expiryDate
          )
      ).to.be.revertedWithCustomError(
        drugRegistry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should reject duplicate batch registration", async function () {
      // Register first batch
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      // Try to register same batch again
      await expect(
        drugRegistry
          .connect(manufacturer)
          .registerBatch(
            testBatchId,
            testDrugName,
            manufacturingDate,
            expiryDate
          )
      ).to.be.revertedWith("Batch already exists");
    });

    it("Should reject invalid expiry date", async function () {
      const invalidExpiryDate = manufacturingDate - 1; // Before manufacturing date

      await expect(
        drugRegistry
          .connect(manufacturer)
          .registerBatch(
            testBatchId,
            testDrugName,
            manufacturingDate,
            invalidExpiryDate
          )
      ).to.be.revertedWith("Invalid expiry date");
    });

    it("Should reject empty drug name", async function () {
      await expect(
        drugRegistry
          .connect(manufacturer)
          .registerBatch(testBatchId, "", manufacturingDate, expiryDate)
      ).to.be.revertedWith("Drug name cannot be empty");
    });
  });

  describe("Batch Transfer", function () {
    beforeEach(async function () {
      // Register a test batch
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );
    });

    it("Should allow current owner to transfer batch", async function () {
      const location = "Warehouse B";

      const tx = await drugRegistry
        .connect(manufacturer)
        .transferBatch(testBatchId, distributor.address, location);

      // Check event emission
      await expect(tx)
        .to.emit(drugRegistry, "BatchTransferred")
        .withArgs(
          testBatchId,
          manufacturer.address,
          distributor.address,
          location
        );

      // Check ownership changed
      const batchInfo = await drugRegistry.getBatchInfo(testBatchId);
      expect(batchInfo.currentOwner).to.equal(distributor.address);

      // Check transfer history
      const transfers = await drugRegistry.getTransferHistory(testBatchId);
      expect(transfers.length).to.equal(1);
      expect(transfers[0].from).to.equal(manufacturer.address);
      expect(transfers[0].to).to.equal(distributor.address);
      expect(transfers[0].location).to.equal(location);
    });

    it("Should not allow non-owner to transfer batch", async function () {
      await expect(
        drugRegistry
          .connect(unauthorized)
          .transferBatch(testBatchId, distributor.address, "Location")
      ).to.be.revertedWith("Not authorized to transfer");
    });

    it("Should not allow transfer to zero address", async function () {
      await expect(
        drugRegistry
          .connect(manufacturer)
          .transferBatch(testBatchId, ethers.ZeroAddress, "Location")
      ).to.be.revertedWith("Invalid recipient address");
    });

    it("Should not allow transfer of non-existent batch", async function () {
      const fakeBatchId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));

      await expect(
        drugRegistry
          .connect(manufacturer)
          .transferBatch(fakeBatchId, distributor.address, "Location")
      ).to.be.revertedWith("Batch does not exist");
    });

    it("Should not allow transfer of inactive batch", async function () {
      // Deactivate the batch first
      await drugRegistry.connect(manufacturer).deactivateBatch(testBatchId);

      await expect(
        drugRegistry
          .connect(manufacturer)
          .transferBatch(testBatchId, distributor.address, "Location")
      ).to.be.revertedWith("Batch is not active");
    });
  });

  describe("Batch Verification", function () {
    it("Should verify active and non-expired batch", async function () {
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      const isValid = await drugRegistry.verifyDrug(testBatchId);
      expect(isValid).to.be.true;
    });

    it("Should not verify non-existent batch", async function () {
      const fakeBatchId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));
      const isValid = await drugRegistry.verifyDrug(fakeBatchId);
      expect(isValid).to.be.false;
    });

    it("Should not verify inactive batch", async function () {
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      // Deactivate batch
      await drugRegistry.connect(manufacturer).deactivateBatch(testBatchId);

      const isValid = await drugRegistry.verifyDrug(testBatchId);
      expect(isValid).to.be.false;
    });

    it("Should not verify expired batch", async function () {
      const pastExpiryDate = Math.floor(Date.now() / 1000) - 86400; // Yesterday

      await drugRegistry.connect(manufacturer).registerBatch(
        testBatchId,
        testDrugName,
        manufacturingDate - 172800, // 2 days ago
        pastExpiryDate
      );

      const isValid = await drugRegistry.verifyDrug(testBatchId);
      expect(isValid).to.be.false;
    });
  });

  describe("ML Anomaly Logging", function () {
    const predictionHash = ethers.keccak256(
      ethers.toUtf8Bytes('{"prediction": "anomaly", "confidence": 0.9}')
    );
    const anomalyType = "temperature_deviation";

    beforeEach(async function () {
      // Register a test batch
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );
    });

    it("Should allow ML logger to log anomaly", async function () {
      const tx = await drugRegistry
        .connect(mlLogger)
        .logAnomalyCheck(testBatchId, predictionHash, anomalyType);

      // Check event emission
      await expect(tx)
        .to.emit(drugRegistry, "AnomalyLogged")
        .withArgs(testBatchId, predictionHash, mlLogger.address, anomalyType);

      // Check anomaly log stored
      const anomalyLogs = await drugRegistry.getAnomalyLogs(testBatchId);
      expect(anomalyLogs.length).to.equal(1);
      expect(anomalyLogs[0].batchId).to.equal(testBatchId);
      expect(anomalyLogs[0].predictionHash).to.equal(predictionHash);
      expect(anomalyLogs[0].logger).to.equal(mlLogger.address);
      expect(anomalyLogs[0].anomalyType).to.equal(anomalyType);
    });

    it("Should not allow non-ML logger to log anomaly", async function () {
      await expect(
        drugRegistry
          .connect(unauthorized)
          .logAnomalyCheck(testBatchId, predictionHash, anomalyType)
      ).to.be.revertedWithCustomError(
        drugRegistry,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should reject anomaly log for non-existent batch", async function () {
      const fakeBatchId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));

      await expect(
        drugRegistry
          .connect(mlLogger)
          .logAnomalyCheck(fakeBatchId, predictionHash, anomalyType)
      ).to.be.revertedWith("Batch does not exist");
    });

    it("Should reject zero prediction hash", async function () {
      await expect(
        drugRegistry
          .connect(mlLogger)
          .logAnomalyCheck(testBatchId, ethers.ZeroHash, anomalyType)
      ).to.be.revertedWith("Invalid prediction hash");
    });
  });

  describe("Batch Deactivation", function () {
    beforeEach(async function () {
      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );
    });

    it("Should allow manufacturer to deactivate own batch", async function () {
      await drugRegistry.connect(manufacturer).deactivateBatch(testBatchId);

      const batchInfo = await drugRegistry.getBatchInfo(testBatchId);
      expect(batchInfo.isActive).to.be.false;
    });

    it("Should allow admin to deactivate any batch", async function () {
      await drugRegistry.connect(owner).deactivateBatch(testBatchId);

      const batchInfo = await drugRegistry.getBatchInfo(testBatchId);
      expect(batchInfo.isActive).to.be.false;
    });

    it("Should not allow unauthorized user to deactivate batch", async function () {
      await expect(
        drugRegistry.connect(unauthorized).deactivateBatch(testBatchId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Batch Queries", function () {
    beforeEach(async function () {
      // Register multiple test batches
      const batchId2 = ethers.keccak256(ethers.toUtf8Bytes("BATCH002"));
      const batchId3 = ethers.keccak256(ethers.toUtf8Bytes("BATCH003"));

      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          testBatchId,
          testDrugName,
          manufacturingDate,
          expiryDate
        );

      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          batchId2,
          "Ibuprofen 200mg",
          manufacturingDate,
          expiryDate
        );

      await drugRegistry
        .connect(manufacturer)
        .registerBatch(
          batchId3,
          "Paracetamol 500mg",
          manufacturingDate,
          expiryDate
        );
    });

    it("Should return all batch IDs", async function () {
      const allBatchIds = await drugRegistry.getAllBatchIds();
      expect(allBatchIds.length).to.equal(3);
      expect(allBatchIds).to.include(testBatchId);
    });

    it("Should return correct batch info", async function () {
      const batchInfo = await drugRegistry.getBatchInfo(testBatchId);
      expect(batchInfo.drugName).to.equal(testDrugName);
      expect(batchInfo.manufacturer).to.equal(manufacturer.address);
      expect(batchInfo.isActive).to.be.true;
    });

    it("Should revert for non-existent batch info", async function () {
      const fakeBatchId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));
      await expect(drugRegistry.getBatchInfo(fakeBatchId)).to.be.revertedWith(
        "Batch does not exist"
      );
    });
  });
});
