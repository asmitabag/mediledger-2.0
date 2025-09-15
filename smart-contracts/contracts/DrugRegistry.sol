// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DrugRegistry
 * @dev Smart contract for tracking drug batches and ML anomaly detection logs
 * 
 * This contract manages drug batch registration, transfer history, and ML-based
 * anomaly detection logging. It uses role-based access control for security.
 */
contract DrugRegistry is AccessControl {
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant ML_LOGGER_ROLE = keccak256("ML_LOGGER_ROLE");
    
    /**
     * @dev Structure to represent a drug batch
     */
    struct DrugBatch {
        bytes32 batchId;
        address manufacturer;
        string drugName;
        uint256 manufacturingDate;
        uint256 expiryDate;
        bool isActive;
        address currentOwner;
    }
    
    /**
     * @dev Structure for transfer history
     */
    struct Transfer {
        address from;
        address to;
        uint256 timestamp;
        string location;
    }
    
    /**
     * @dev Structure for anomaly logs
     */
    struct AnomalyLog {
        bytes32 batchId;
        bytes32 predictionHash;
        address logger;
        uint256 timestamp;
        string anomalyType;
    }
    
    // Mappings for data storage
    mapping(bytes32 => DrugBatch) public drugBatches;
    mapping(bytes32 => Transfer[]) public transferHistory;
    mapping(bytes32 => AnomalyLog[]) public anomalyLogs;
    mapping(bytes32 => bool) public batchExists;
    
    // Arrays for iteration
    bytes32[] public allBatchIds;
    
    /**
     * @dev Emitted when a new drug batch is registered
     */
    event BatchRegistered(
        bytes32 indexed batchId,
        address indexed manufacturer,
        string drugName,
        uint256 manufacturingDate,
        uint256 expiryDate
    );
    
    /**
     * @dev Emitted when a batch is transferred
     */
    event BatchTransferred(
        bytes32 indexed batchId,
        address indexed from,
        address indexed to,
        string location,
        uint256 timestamp
    );
    
    /**
     * @dev Emitted when an anomaly is logged
     */
    event AnomalyLogged(
        bytes32 indexed batchId,
        bytes32 indexed predictionHash,
        address indexed logger,
        string anomalyType,
        uint256 timestamp
    );
    
    /**
     * @dev Constructor to set up admin role
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Register a new drug batch
     * @param batchId Unique identifier for the batch
     * @param drugName Name of the drug
     * @param manufacturingDate Manufacturing timestamp
     * @param expiryDate Expiry timestamp
     */
    function registerBatch(
        bytes32 batchId,
        string memory drugName,
        uint256 manufacturingDate,
        uint256 expiryDate
    ) external onlyRole(MANUFACTURER_ROLE) {
        require(!batchExists[batchId], "Batch already exists");
        require(expiryDate > manufacturingDate, "Invalid expiry date");
        require(bytes(drugName).length > 0, "Drug name cannot be empty");
        
        drugBatches[batchId] = DrugBatch({
            batchId: batchId,
            manufacturer: msg.sender,
            drugName: drugName,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            isActive: true,
            currentOwner: msg.sender
        });
        
        batchExists[batchId] = true;
        allBatchIds.push(batchId);
        
        emit BatchRegistered(batchId, msg.sender, drugName, manufacturingDate, expiryDate);
    }
    
    /**
     * @dev Transfer a drug batch to another party
     * @param batchId Batch identifier
     * @param to Address to transfer to
     * @param location Current location of the batch
     */
    function transferBatch(
        bytes32 batchId,
        address to,
        string memory location
    ) external {
        require(batchExists[batchId], "Batch does not exist");
        require(drugBatches[batchId].currentOwner == msg.sender, "Not authorized to transfer");
        require(to != address(0), "Invalid recipient address");
        require(drugBatches[batchId].isActive, "Batch is not active");
        
        // Update current owner
        drugBatches[batchId].currentOwner = to;
        
        // Add to transfer history
        transferHistory[batchId].push(Transfer({
            from: msg.sender,
            to: to,
            timestamp: block.timestamp,
            location: location
        }));
        
        emit BatchTransferred(batchId, msg.sender, to, location, block.timestamp);
    }
    
    /**
     * @dev Verify if a drug batch is valid and active
     * @param batchId Batch identifier
     * @return isValid True if batch is valid and not expired
     */
    function verifyDrug(bytes32 batchId) external view returns (bool isValid) {
        if (!batchExists[batchId]) {
            return false;
        }
        
        DrugBatch memory batch = drugBatches[batchId];
        return batch.isActive && block.timestamp < batch.expiryDate;
    }
    
    /**
     * @dev Log an ML anomaly detection result
     * @param batchId Batch identifier
     * @param predictionHash Hash of the ML prediction JSON
     * @param anomalyType Type of anomaly detected
     */
    function logAnomalyCheck(
        bytes32 batchId,
        bytes32 predictionHash,
        string memory anomalyType
    ) external onlyRole(ML_LOGGER_ROLE) {
        require(batchExists[batchId], "Batch does not exist");
        require(predictionHash != bytes32(0), "Invalid prediction hash");
        
        anomalyLogs[batchId].push(AnomalyLog({
            batchId: batchId,
            predictionHash: predictionHash,
            logger: msg.sender,
            timestamp: block.timestamp,
            anomalyType: anomalyType
        }));
        
        emit AnomalyLogged(batchId, predictionHash, msg.sender, anomalyType, block.timestamp);
    }
    
    /**
     * @dev Get transfer history for a batch
     * @param batchId Batch identifier
     * @return Array of transfers
     */
    function getTransferHistory(bytes32 batchId) external view returns (Transfer[] memory) {
        return transferHistory[batchId];
    }
    
    /**
     * @dev Get anomaly logs for a batch
     * @param batchId Batch identifier
     * @return Array of anomaly logs
     */
    function getAnomalyLogs(bytes32 batchId) external view returns (AnomalyLog[] memory) {
        return anomalyLogs[batchId];
    }
    
    /**
     * @dev Get basic batch information
     * @param batchId Batch identifier
     * @return Batch information struct
     */
    function getBatchInfo(bytes32 batchId) external view returns (DrugBatch memory) {
        require(batchExists[batchId], "Batch does not exist");
        return drugBatches[batchId];
    }
    
    /**
     * @dev Get all registered batch IDs
     * @return Array of batch IDs
     */
    function getAllBatchIds() external view returns (bytes32[] memory) {
        return allBatchIds;
    }
    
    /**
     * @dev Deactivate a batch (recall)
     * @param batchId Batch identifier
     */
    function deactivateBatch(bytes32 batchId) external {
        require(batchExists[batchId], "Batch does not exist");
        require(
            drugBatches[batchId].manufacturer == msg.sender || 
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        drugBatches[batchId].isActive = false;
    }
    
    /**
     * @dev Add manufacturer role to an address
     * @param manufacturer Address to grant role
     */
    function addManufacturer(address manufacturer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MANUFACTURER_ROLE, manufacturer);
    }
    
    /**
     * @dev Add distributor role to an address  
     * @param distributor Address to grant role
     */
    function addDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DISTRIBUTOR_ROLE, distributor);
    }
    
    /**
     * @dev Add ML logger role to an address
     * @param logger Address to grant role
     */
    function addMLLogger(address logger) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ML_LOGGER_ROLE, logger);
    }
}