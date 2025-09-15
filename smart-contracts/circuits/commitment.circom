pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Commitment Circuit
 * 
 * This circuit generates a Poseidon hash commitment from a preimage and salt.
 * The preimage is typically a field-reduced SHA256 hash of encrypted medical data.
 * 
 * Inputs:
 *   - preimage: Field element (reduced from SHA256)
 *   - salt: Random field element for commitment hiding
 * 
 * Outputs:
 *   - commitment: Poseidon(preimage, salt)
 */
template CommitmentCircuit() {
    // Private inputs
    signal private input preimage;
    signal private input salt;
    
    // Public output
    signal output commitment;
    
    // Instantiate Poseidon hash with 2 inputs
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== preimage;
    poseidon.inputs[1] <== salt;
    
    // Output the commitment
    commitment <== poseidon.out;
}

component main = CommitmentCircuit();