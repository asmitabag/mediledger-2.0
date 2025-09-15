// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external view returns (bool);
}

/**
 * @title MedicalRecord
 * @dev Smart contract for storing medical record commitments with zero-knowledge proofs
 * 
 * This contract allows healthcare providers to commit medical records to the blockchain
 * using zero-knowledge proofs. Only the commitment (Poseidon hash) is stored on-chain,
 * preserving privacy while ensuring integrity.
 */
contract MedicalRecord is AccessControl {
    bytes32 public constant HEALTHCARE_PROVIDER_ROLE = keccak256("HEALTHCARE_PROVIDER_ROLE");
    
    IVerifier public immutable verifier;
    mapping(address => bytes32[]) public commitments;
    mapping(bytes32 => bool) public commitmentExists;

    event RecordCommitted(address indexed provider, bytes32 indexed commitment, uint256 timestamp);

    constructor(address _verifier) {
        require(_verifier != address(0), "Verifier address cannot be zero");
        verifier = IVerifier(_verifier);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Commit a medical record using zero-knowledge proof
     * @param a First component of the zk-SNARK proof
     * @param b Second component of the zk-SNARK proof
     * @param c Third component of the zk-SNARK proof
     * @param input Public input array (should contain exactly 1 element - the commitment)
     */
    function commitRecord(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external onlyRole(HEALTHCARE_PROVIDER_ROLE) {
        // Verify the zero-knowledge proof
        bool proofValid = verifier.verifyProof(a, b, c, input);
        require(proofValid, "Invalid zero-knowledge proof");
        
        // Extract commitment from public input
        bytes32 commitment = bytes32(input[0]);
        
        // Ensure commitment doesn't already exist
        require(!commitmentExists[commitment], "Commitment already exists");
        
        // Store commitment
        commitments[msg.sender].push(commitment);
        commitmentExists[commitment] = true;
        
        emit RecordCommitted(msg.sender, commitment, block.timestamp);
    }
    
    /**
     * @dev Get all commitments for a healthcare provider
     * @param provider Address of the healthcare provider
     * @return Array of commitment hashes
     */
    function getCommitments(address provider) external view returns (bytes32[] memory) {
        return commitments[provider];
    }
    
    /**
     * @dev Get the number of commitments for a provider
     * @param provider Address of the healthcare provider
     * @return Number of commitments
     */
    function getCommitmentCount(address provider) external view returns (uint256) {
        return commitments[provider].length;
    }
    
    /**
     * @dev Add a healthcare provider role to an address
     * @param provider Address to grant the role to
     */
    function addHealthcareProvider(address provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(HEALTHCARE_PROVIDER_ROLE, provider);
    }
    
    /**
     * @dev Remove healthcare provider role from an address
     * @param provider Address to revoke the role from
     */
    function removeHealthcareProvider(address provider) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(HEALTHCARE_PROVIDER_ROLE, provider);
    }
    
    /**
     * @dev Check if a commitment is valid and exists
     * @param commitment The commitment to verify
     * @return True if commitment exists
     */
    function verifyCommitment(bytes32 commitment) external view returns (bool) {
        return commitmentExists[commitment];
    }
}