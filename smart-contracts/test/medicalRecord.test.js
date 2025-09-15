const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const {
  hashToField,
  generateSalt,
  formatProofForSolidity,
  ensureDirectoryExists,
} = require("../scripts/utils/proofUtils");

describe("MedicalRecord Contract", function () {
  let Verifier, verifier;
  let MedicalRecord, medicalRecord;
  let owner, healthcare1, healthcare2, unauthorized;

  // Test data
  const testPreimage = hashToField(
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  );
  const testSalt = generateSalt();

  before(async function () {
    // Get signers
    [owner, healthcare1, healthcare2, unauthorized] = await ethers.getSigners();

    // Ensure test directories exist
    ensureDirectoryExists("test_data");
    ensureDirectoryExists("circom_build");
    ensureDirectoryExists("zkeys");

    console.log("Setting up test environment...");

    // Check if circuit is built and zkeys exist
    const wasmPath = path.join("circom_build", "commitment.wasm");
    const zkeyPath = path.join("zkeys", "commitment_final.zkey");

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      console.log("⚠️  Circuit not built or zkeys not generated.");
      console.log(
        "Run 'npm run build:circuit' and 'npm run setup:zkey' first."
      );
      console.log("For tests, we'll use mock proof verification.");
    }
  });

  beforeEach(async function () {
    // Deploy Verifier contract (or mock)
    try {
      Verifier = await ethers.getContractFactory("Groth16Verifier");
      verifier = await Verifier.deploy();
      await verifier.waitForDeployment();
    } catch (error) {
      // If Groth16Verifier.sol doesn't exist, deploy a mock verifier
      console.log("Using mock verifier for tests");
      const MockVerifier = await ethers.getContractFactory("MockVerifier");
      verifier = await MockVerifier.deploy();
      await verifier.waitForDeployment();
    }

    // Deploy MedicalRecord contract
    MedicalRecord = await ethers.getContractFactory("MedicalRecord");
    medicalRecord = await MedicalRecord.deploy(await verifier.getAddress());
    await medicalRecord.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct verifier address", async function () {
      expect(await medicalRecord.verifier()).to.equal(
        await verifier.getAddress()
      );
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // bytes32(0)
      expect(await medicalRecord.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to
        .be.true;
    });

    it("Should not grant healthcare provider role to deployer by default", async function () {
      const HEALTHCARE_PROVIDER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("HEALTHCARE_PROVIDER_ROLE")
      );
      expect(
        await medicalRecord.hasRole(HEALTHCARE_PROVIDER_ROLE, owner.address)
      ).to.be.false;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to add healthcare provider", async function () {
      await medicalRecord.addHealthcareProvider(healthcare1.address);

      const HEALTHCARE_PROVIDER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("HEALTHCARE_PROVIDER_ROLE")
      );
      expect(
        await medicalRecord.hasRole(
          HEALTHCARE_PROVIDER_ROLE,
          healthcare1.address
        )
      ).to.be.true;
    });

    it("Should allow admin to remove healthcare provider", async function () {
      // First add the provider
      await medicalRecord.addHealthcareProvider(healthcare1.address);

      // Then remove
      await medicalRecord.removeHealthcareProvider(healthcare1.address);

      const HEALTHCARE_PROVIDER_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("HEALTHCARE_PROVIDER_ROLE")
      );
      expect(
        await medicalRecord.hasRole(
          HEALTHCARE_PROVIDER_ROLE,
          healthcare1.address
        )
      ).to.be.false;
    });

    it("Should not allow non-admin to add healthcare provider", async function () {
      await expect(
        medicalRecord
          .connect(unauthorized)
          .addHealthcareProvider(healthcare1.address)
      ).to.be.revertedWithCustomError(
        medicalRecord,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Proof Verification and Commitment", function () {
    beforeEach(async function () {
      // Grant healthcare provider role
      await medicalRecord.addHealthcareProvider(healthcare1.address);
    });

    it("Should reject commitment from unauthorized account", async function () {
      // Mock proof data with correct signature
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage],
      };

      await expect(
        medicalRecord
          .connect(unauthorized)
          .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input)
      ).to.be.revertedWithCustomError(
        medicalRecord,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should reject invalid input length", async function () {
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage, "123"], // Invalid length - should be exactly 1 element
      };

      // This should fail at the parameter level before reaching the contract
      await expect(
        medicalRecord
          .connect(healthcare1)
          .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input)
      ).to.be.rejected;
    });

    it("Should generate and verify real proof if circuit is available", async function () {
      this.timeout(30000); // Increase timeout for proof generation

      const wasmPath = path.join("circom_build", "commitment.wasm");
      const zkeyPath = path.join("zkeys", "commitment_final.zkey");

      if (fs.existsSync(wasmPath) && fs.existsSync(zkeyPath)) {
        console.log("Generating real ZK proof for test...");

        // Create witness input
        const input = {
          preimage: testPreimage,
          salt: testSalt,
        };

        // Generate witness
        const { witness } = await snarkjs.wtns.calculate(input, wasmPath);

        // Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.prove(
          zkeyPath,
          witness
        );

        // Format for Solidity
        const solidityProof = formatProofForSolidity(proof, publicSignals);

        // Submit to contract
        const tx = await medicalRecord
          .connect(healthcare1)
          .commitRecord(
            solidityProof.a,
            solidityProof.b,
            solidityProof.c,
            solidityProof.input
          );

        const receipt = await tx.wait();

        // Check event was emitted
        expect(receipt.logs.length).to.be.greaterThan(0);

        // Check commitment was stored
        const commitments = await medicalRecord.getCommitments(
          healthcare1.address
        );
        expect(commitments.length).to.equal(1);
        expect(commitments[0]).to.equal(
          ethers.zeroPadValue(ethers.toBeHex(publicSignals[0]), 32)
        );

        console.log("✅ Real ZK proof verification successful!");
      } else {
        console.log("⏭️  Skipping real proof test - circuit not available");
        this.skip();
      }
    });

    it("Should accept valid mock proof", async function () {
      // This test assumes a mock verifier that always returns true
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage],
      };

      const tx = await medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

      const receipt = await tx.wait();

      // Check RecordCommitted event
      const event = receipt.logs.find((log) => {
        try {
          const parsed = medicalRecord.interface.parseLog(log);
          return parsed && parsed.name === "RecordCommitted";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      // Check commitment stored
      const commitments = await medicalRecord.getCommitments(
        healthcare1.address
      );
      expect(commitments.length).to.equal(1);
      expect(commitments[0]).to.equal(
        ethers.zeroPadValue(ethers.toBeHex(mockProof.input[0]), 32)
      );
    });

    it("Should prevent duplicate commitments", async function () {
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage],
      };

      // Submit first commitment
      await medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

      // Try to submit same commitment again
      await expect(
        medicalRecord
          .connect(healthcare1)
          .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input)
      ).to.be.revertedWith("Commitment already exists");
    });
  });

  describe("Commitment Queries", function () {
    beforeEach(async function () {
      // Grant roles and submit test commitments
      await medicalRecord.addHealthcareProvider(healthcare1.address);
      await medicalRecord.addHealthcareProvider(healthcare2.address);

      // Submit commitments from healthcare1
      const mockProof1 = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage],
      };

      const mockProof2 = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [hashToField("0xabcdef")], // Different commitment
      };

      await medicalRecord
        .connect(healthcare1)
        .commitRecord(
          mockProof1.a,
          mockProof1.b,
          mockProof1.c,
          mockProof1.input
        );

      await medicalRecord
        .connect(healthcare1)
        .commitRecord(
          mockProof2.a,
          mockProof2.b,
          mockProof2.c,
          mockProof2.input
        );
    });

    it("Should return correct commitments for provider", async function () {
      const commitments = await medicalRecord.getCommitments(
        healthcare1.address
      );
      expect(commitments.length).to.equal(2);
    });

    it("Should return correct commitment count", async function () {
      const count = await medicalRecord.getCommitmentCount(healthcare1.address);
      expect(count).to.equal(2);

      const count2 = await medicalRecord.getCommitmentCount(
        healthcare2.address
      );
      expect(count2).to.equal(0);
    });

    it("Should verify existing commitments", async function () {
      const commitments = await medicalRecord.getCommitments(
        healthcare1.address
      );

      for (const commitment of commitments) {
        const isValid = await medicalRecord.verifyCommitment(commitment);
        expect(isValid).to.be.true;
      }
    });

    it("Should not verify non-existent commitments", async function () {
      const fakeCommitment = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      const isValid = await medicalRecord.verifyCommitment(fakeCommitment);
      expect(isValid).to.be.false;
    });
  });

  describe("Events", function () {
    it("Should emit RecordCommitted event with correct parameters", async function () {
      await medicalRecord.addHealthcareProvider(healthcare1.address);

      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [testPreimage],
      };

      // Get current block timestamp for accurate event testing
      const currentBlock = await ethers.provider.getBlock("latest");
      const expectedTimestamp = currentBlock.timestamp + 1;

      const tx = medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

      await expect(tx)
        .to.emit(medicalRecord, "RecordCommitted")
        .withArgs(
          healthcare1.address,
          ethers.zeroPadValue(ethers.toBeHex(mockProof.input[0]), 32),
          expectedTimestamp
        );
    });
  });

  describe("Edge Cases", function () {
    beforeEach(async function () {
      await medicalRecord.addHealthcareProvider(healthcare1.address);
    });

    it("Should handle zero commitment value", async function () {
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: ["0"], // Zero commitment
      };

      const tx = await medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify commitment was stored
      const commitments = await medicalRecord.getCommitments(healthcare1.address);
      expect(commitments.length).to.equal(1);
      expect(commitments[0]).to.equal(ethers.ZeroHash);
    });

    it("Should handle maximum uint256 commitment value", async function () {
      const maxUint256 = ethers.MaxUint256;
      
      const mockProof = {
        a: ["1", "2"],
        b: [
          ["1", "2"],
          ["3", "4"],
        ],
        c: ["5", "6"],
        input: [maxUint256.toString()],
      };

      const tx = await medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof.a, mockProof.b, mockProof.c, mockProof.input);

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify commitment was stored
      const commitments = await medicalRecord.getCommitments(healthcare1.address);
      expect(commitments.length).to.equal(1);
      expect(commitments[0]).to.equal(
        ethers.zeroPadValue(ethers.toBeHex(maxUint256), 32)
      );
    });

    it("Should maintain separate commitment lists for different providers", async function () {
      await medicalRecord.addHealthcareProvider(healthcare2.address);

      const mockProof1 = {
        a: ["1", "2"],
        b: [["1", "2"], ["3", "4"]],
        c: ["5", "6"],
        input: [testPreimage],
      };

      const mockProof2 = {
        a: ["1", "2"],
        b: [["1", "2"], ["3", "4"]],
        c: ["5", "6"],
        input: [hashToField("0xdifferent")],
      };

      // Submit commitment from healthcare1
      await medicalRecord
        .connect(healthcare1)
        .commitRecord(mockProof1.a, mockProof1.b, mockProof1.c, mockProof1.input);

      // Submit commitment from healthcare2
      await medicalRecord
        .connect(healthcare2)
        .commitRecord(mockProof2.a, mockProof2.b, mockProof2.c, mockProof2.input);

      // Verify separate lists
      const commitments1 = await medicalRecord.getCommitments(healthcare1.address);
      const commitments2 = await medicalRecord.getCommitments(healthcare2.address);

      expect(commitments1.length).to.equal(1);
      expect(commitments2.length).to.equal(1);
      expect(commitments1[0]).to.not.equal(commitments2[0]);
    });
  });
});