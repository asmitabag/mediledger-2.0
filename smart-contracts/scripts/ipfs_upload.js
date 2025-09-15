#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  encryptData,
  decryptData,
  generateAESKey,
  ensureDirectoryExists,
  logWithTimestamp,
} = require("./utils/proofUtils");

require("dotenv").config();

// Dynamic import for Pinata SDK (ESM module)
let pinata;

/**
 * Initialize Pinata SDK
 */
async function initPinata() {
  if (process.env.IPFS_MOCK === "true") {
    logWithTimestamp("Using mock IPFS (no Pinata required)");
    return null;
  }

  if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
    logWithTimestamp("Pinata credentials not found, using mock IPFS");
    return null;
  }

  try {
    const { PinataSDK } = await import("@pinata/sdk");
    const sdk = new PinataSDK({
      pinataApiKey: process.env.PINATA_API_KEY,
      pinataSecretApiKey: process.env.PINATA_API_SECRET,
    });

    // Test authentication
    await sdk.testAuthentication();
    logWithTimestamp("✅ Pinata authentication successful");
    return sdk;
  } catch (error) {
    logWithTimestamp(
      `Pinata initialization failed: ${error.message}, using mock`
    );
    return null;
  }
}

/**
 * Mock IPFS upload for testing
 * @param {Buffer} data - Data to "upload"
 * @param {string} name - File name
 * @returns {string} Mock CID
 */
function mockIPFSUpload(data, name) {
  // Generate deterministic mock CID based on data hash
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  const mockCID = `Qm${hash.substring(0, 44)}`;

  // Save to mock storage directory
  const mockDir = path.join("mock_ipfs");
  ensureDirectoryExists(mockDir);

  const mockPath = path.join(mockDir, `${mockCID}.dat`);
  fs.writeFileSync(mockPath, data);

  logWithTimestamp(`Mock IPFS: Saved ${name} as ${mockCID}`);
  return mockCID;
}

/**
 * Retrieve from mock IPFS storage
 * @param {string} cid - Mock CID
 * @returns {Buffer} Retrieved data
 */
function mockIPFSRetrieve(cid) {
  const mockPath = path.join("mock_ipfs", `${cid}.dat`);
  if (!fs.existsSync(mockPath)) {
    throw new Error(`Mock IPFS: File not found for CID ${cid}`);
  }
  return fs.readFileSync(mockPath);
}

/**
 * Upload encrypted file to IPFS (or mock)
 * @param {string} filePath - Path to file to upload
 * @param {string} encryptionKey - AES encryption key (hex)
 * @returns {object} Upload result with CID and metadata
 */
async function uploadToIPFS(filePath, encryptionKey = null) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    logWithTimestamp(`Starting IPFS upload for: ${filePath}`);

    // Generate encryption key if not provided
    const key = encryptionKey || generateAESKey();
    logWithTimestamp(`Using encryption key: ${key.substring(0, 8)}...`);

    // Read and encrypt file
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    logWithTimestamp(`Encrypting file (${fileData.length} bytes)...`);
    const encrypted = encryptData(fileData, key);

    // Prepare encrypted data for upload
    const uploadData = Buffer.from(
      JSON.stringify({
        fileName: fileName,
        iv: encrypted.iv,
        encryptedData: encrypted.encryptedData,
        timestamp: new Date().toISOString(),
        originalSize: fileData.length,
      })
    );

    // Initialize Pinata or use mock
    pinata = await initPinata();

    let cid;
    if (pinata) {
      // Upload to real IPFS via Pinata
      logWithTimestamp("Uploading to Pinata IPFS...");

      const options = {
        pinataMetadata: {
          name: `encrypted_${fileName}`,
          keyvalues: {
            originalName: fileName,
            encrypted: "true",
            uploadTimestamp: new Date().toISOString(),
          },
        },
        pinataOptions: {
          cidVersion: 0,
        },
      };

      const result = await pinata.pinFileToIPFS(uploadData, options);
      cid = result.IpfsHash;
      logWithTimestamp(`✅ Uploaded to IPFS: ${cid}`);
    } else {
      // Use mock IPFS
      cid = mockIPFSUpload(uploadData, fileName);
    }

    // Save upload metadata locally
    const metadata = {
      originalFile: filePath,
      fileName: fileName,
      cid: cid,
      encryptionKey: key,
      iv: encrypted.iv,
      uploadTimestamp: new Date().toISOString(),
      originalSize: fileData.length,
      encryptedSize: uploadData.length,
      mock: !pinata,
    };

    const metadataDir = path.join("ipfs_data");
    ensureDirectoryExists(metadataDir);

    const metadataPath = path.join(metadataDir, `${cid}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    logWithTimestamp(`Metadata saved to: ${metadataPath}`);

    console.log("\n=== IPFS UPLOAD SUMMARY ===");
    console.log(`Original File: ${filePath}`);
    console.log(`File Name: ${fileName}`);
    console.log(`IPFS CID: ${cid}`);
    console.log(`Encryption Key: ${key}`);
    console.log(`Original Size: ${fileData.length} bytes`);
    console.log(`Encrypted Size: ${uploadData.length} bytes`);
    console.log(`Mock Mode: ${!pinata}`);
    console.log("============================\n");

    return {
      cid,
      encryptionKey: key,
      metadata,
    };
  } catch (error) {
    console.error(`❌ Error uploading to IPFS: ${error.message}`);
    throw error;
  }
}

/**
 * Download and decrypt file from IPFS (or mock)
 * @param {string} cid - IPFS CID
 * @param {string} encryptionKey - AES encryption key (hex)
 * @param {string} outputPath - Path to save decrypted file
 */
async function downloadFromIPFS(cid, encryptionKey, outputPath) {
  try {
    logWithTimestamp(`Starting IPFS download for CID: ${cid}`);

    let encryptedData;

    pinata = await initPinata();

    if (pinata) {
      // Download from real IPFS via Pinata
      logWithTimestamp("Downloading from Pinata IPFS...");
      const response = await pinata.pinList({
        hashContains: cid,
        status: "pinned",
      });

      if (response.count === 0) {
        throw new Error(`File not found in IPFS: ${cid}`);
      }

      // Note: Pinata SDK doesn't have direct download method
      // In production, you'd use an IPFS gateway or direct IPFS node
      throw new Error(
        "Direct download via Pinata SDK not implemented. Use IPFS gateway."
      );
    } else {
      // Use mock IPFS
      encryptedData = mockIPFSRetrieve(cid);
    }

    // Parse encrypted data
    const encryptedInfo = JSON.parse(encryptedData.toString());

    logWithTimestamp(`Decrypting file: ${encryptedInfo.fileName}`);

    // Decrypt the data
    const decryptedData = decryptData(
      encryptedInfo.encryptedData,
      encryptedInfo.iv,
      encryptionKey
    );

    // Save decrypted file
    ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, decryptedData);

    logWithTimestamp(`✅ File decrypted and saved to: ${outputPath}`);

    console.log("\n=== IPFS DOWNLOAD SUMMARY ===");
    console.log(`IPFS CID: ${cid}`);
    console.log(`Original Name: ${encryptedInfo.fileName}`);
    console.log(`Output Path: ${outputPath}`);
    console.log(`File Size: ${decryptedData.length} bytes`);
    console.log(`Mock Mode: ${!pinata}`);
    console.log("==============================\n");

    return {
      fileName: encryptedInfo.fileName,
      size: decryptedData.length,
      outputPath,
    };
  } catch (error) {
    console.error(`❌ Error downloading from IPFS: ${error.message}`);
    throw error;
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "upload":
        if (args.length < 2) {
          console.error(
            "Usage: node scripts/ipfs_upload.js upload <file-path> [encryption-key]"
          );
          process.exit(1);
        }
        const filePath = args[1];
        const key = args[2];
        await uploadToIPFS(filePath, key);
        break;

      case "download":
        if (args.length < 4) {
          console.error(
            "Usage: node scripts/ipfs_upload.js download <cid> <encryption-key> <output-path>"
          );
          process.exit(1);
        }
        const cid = args[1];
        const encKey = args[2];
        const outputPath = args[3];
        await downloadFromIPFS(cid, encKey, outputPath);
        break;

      case "test":
        // Test upload and download
        logWithTimestamp("Running IPFS test...");

        // Create test file
        const testDir = path.join("test_data");
        ensureDirectoryExists(testDir);

        const testFile = path.join(testDir, "test_medical_record.txt");
        const testContent = `Medical Record Test Data
Patient ID: 12345
Doctor: Dr. Smith
Date: ${new Date().toISOString()}
Diagnosis: Test diagnosis for IPFS functionality
`;
        fs.writeFileSync(testFile, testContent);
        logWithTimestamp(`Created test file: ${testFile}`);

        // Upload
        const uploadResult = await uploadToIPFS(testFile);

        // Download
        const downloadPath = path.join(testDir, "downloaded_test.txt");
        await downloadFromIPFS(
          uploadResult.cid,
          uploadResult.encryptionKey,
          downloadPath
        );

        // Verify
        const originalContent = fs.readFileSync(testFile, "utf8");
        const downloadedContent = fs.readFileSync(downloadPath, "utf8");

        if (originalContent === downloadedContent) {
          logWithTimestamp("✅ IPFS test passed - content matches!");
        } else {
          throw new Error("❌ IPFS test failed - content mismatch!");
        }
        break;

      default:
        console.log("MediLedger IPFS Upload Tool");
        console.log("");
        console.log("Commands:");
        console.log(
          "  upload <file-path> [encryption-key]  - Upload and encrypt file to IPFS"
        );
        console.log(
          "  download <cid> <key> <output-path>   - Download and decrypt file from IPFS"
        );
        console.log(
          "  test                                 - Run upload/download test"
        );
        console.log("");
        console.log("Environment variables:");
        console.log("  PINATA_API_KEY     - Pinata API key");
        console.log("  PINATA_API_SECRET  - Pinata API secret");
        console.log("  IPFS_MOCK=true     - Use mock IPFS instead of Pinata");
        break;
    }
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  mockIPFSUpload,
  mockIPFSRetrieve,
  encryptData,
  decryptData,
  generateAESKey,
};
