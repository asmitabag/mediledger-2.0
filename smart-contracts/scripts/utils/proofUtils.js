const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// BN254 field modulus for SNARK field reduction
const SNARK_FIELD = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

/**
 * Convert a SHA256 hash to a SNARK field element
 * @param {string} hash - Hex string of SHA256 hash
 * @returns {string} Field element as string
 */
function hashToField(hash) {
  // Remove 0x prefix if present
  const cleanHash = hash.startsWith("0x") ? hash.slice(2) : hash;

  // Convert to BigInt and reduce modulo SNARK field
  const hashBigInt = BigInt("0x" + cleanHash);
  const fieldElement = hashBigInt % SNARK_FIELD;

  return fieldElement.toString();
}

/**
 * Generate a random salt for commitment
 * @returns {string} Random field element as string
 */
function generateSalt() {
  const randomBytes = crypto.randomBytes(32);
  const randomBigInt = BigInt("0x" + randomBytes.toString("hex"));
  const salt = randomBigInt % SNARK_FIELD;
  return salt.toString();
}

/**
 * Compute SHA256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {string} SHA256 hash as hex string
 */
function computeFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return hash;
}

/**
 * Create witness input for the commitment circuit
 * @param {string} preimage - Field element preimage
 * @param {string} salt - Field element salt
 * @returns {object} Input object for witness generation
 */
function createWitnessInput(preimage, salt) {
  return {
    preimage: preimage,
    salt: salt,
  };
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validate field element is within SNARK field
 * @param {string} element - Field element as string
 * @returns {boolean} True if valid
 */
function isValidFieldElement(element) {
  try {
    const elementBigInt = BigInt(element);
    return elementBigInt >= 0n && elementBigInt < SNARK_FIELD;
  } catch (error) {
    return false;
  }
}

/**
 * Format proof for Solidity call
 * @param {object} proof - snarkjs proof object
 * @param {array} publicSignals - Public signals array
 * @returns {object} Formatted proof components
 */
function formatProofForSolidity(proof, publicSignals) {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
    input: publicSignals,
  };
}

/**
 * AES encryption for files
 * @param {Buffer} data - Data to encrypt
 * @param {string} key - 32-byte hex key
 * @returns {object} Encrypted data and IV
 */
function encryptData(data, key) {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher("aes-256-cbc", keyBuffer);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted.toString("hex"),
  };
}

/**
 * AES decryption for files
 * @param {string} encryptedHex - Encrypted data as hex
 * @param {string} ivHex - IV as hex
 * @param {string} key - 32-byte hex key
 * @returns {Buffer} Decrypted data
 */
function decryptData(encryptedHex, ivHex, key) {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedData = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipher("aes-256-cbc", keyBuffer);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted;
}

/**
 * Generate a random AES key
 * @returns {string} 32-byte key as hex string
 */
function generateAESKey() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Log with timestamp
 * @param {string} message - Message to log
 */
function logWithTimestamp(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

module.exports = {
  SNARK_FIELD,
  hashToField,
  generateSalt,
  computeFileHash,
  createWitnessInput,
  ensureDirectoryExists,
  isValidFieldElement,
  formatProofForSolidity,
  encryptData,
  decryptData,
  generateAESKey,
  logWithTimestamp,
};
