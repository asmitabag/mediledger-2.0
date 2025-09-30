"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  FileText,
  Activity,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  MEDICAL_RECORD_ADDRESS,
  MEDICAL_RECORD_ABI,
} from "@/lib/contracts/MedicalRecord";
import { keccak256, toBytes } from "viem";

const VERIFIER_ADDRESS = "0xB1CEA5b5F7d459F502CE27D08D39b214F9d3c7A9" as const;

const VERIFIER_ABI = [
  {
    inputs: [
      { internalType: "uint256[2]", name: "a", type: "uint256[2]" },
      { internalType: "uint256[2][2]", name: "b", type: "uint256[2][2]" },
      { internalType: "uint256[2]", name: "c", type: "uint256[2]" },
      { internalType: "uint256[1]", name: "input", type: "uint256[1]" },
    ],
    name: "verifyProof",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function",
  },
] as const;

let snarkjs: any = null;
if (typeof window !== "undefined") {
  snarkjs = require("snarkjs");
}

function HealthcareDashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [recordData, setRecordData] = useState("");
  const [verifyCommitment, setVerifyCommitment] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const [proofStatus, setProofStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const HEALTHCARE_PROVIDER_ROLE = keccak256(
    toBytes("HEALTHCARE_PROVIDER_ROLE")
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: hasRole, isLoading: roleLoading } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: MEDICAL_RECORD_ABI,
    functionName: "hasRole",
    args: address ? [HEALTHCARE_PROVIDER_ROLE, address] : undefined,
    query: {
      enabled: !!address && mounted,
    },
  });

  const { data: commitmentCount, refetch: refetchCount } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: MEDICAL_RECORD_ABI,
    functionName: "getCommitmentCount",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && mounted,
    },
  });

  const { data: commitments, refetch: refetchCommitments } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: MEDICAL_RECORD_ABI,
    functionName: "getCommitments",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && mounted,
    },
  });

  const { data: isValidCommitment } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: MEDICAL_RECORD_ABI,
    functionName: "verifyCommitment",
    args: verifyCommitment ? [verifyCommitment as `0x${string}`] : undefined,
    query: {
      enabled: !!verifyCommitment && mounted,
    },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetchCount();
      refetchCommitments();
      setRecordData("");
      setSelectedFile(null);
      setProofError("");
      setProofStatus("");
    }
  }, [isSuccess, refetchCount, refetchCommitments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecordData("");
    }
  };

  const generateAndSubmitProof = async () => {
    if ((!recordData && !selectedFile) || !snarkjs) {
      setProofError("SnarkJS not loaded or no record data/file");
      return;
    }

    setIsGeneratingProof(true);
    setProofError("");
    setProofStatus("Processing data...");

    try {
      let dataToHash: string;

      if (selectedFile) {
        setProofStatus("Reading and hashing file...");
        const arrayBuffer = await selectedFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        dataToHash = keccak256(uint8Array);
      } else {
        dataToHash = keccak256(toBytes(recordData));
      }

      const hashStr = dataToHash.slice(2);
      const preimage =
        BigInt("0x" + hashStr) %
        BigInt(
          "21888242871839275222246405745257275088548364400416034343698204186575808495617"
        );

      const salt = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

      const input = {
        preimage: preimage.toString(),
        salt: salt.toString(),
      };

      setProofStatus("Generating zero-knowledge proof...");
      console.log("Generating proof with input:", input);

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/commitment.wasm",
        "/commitment_final.zkey"
      );

      console.log("Proof generated successfully");
      console.log("Public signals:", publicSignals);

      const proofForContract = {
        a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])],
        b: [
          [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
          [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
        ],
        c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])],
        input: [BigInt(publicSignals[0])],
      };

      setProofStatus("Verifying proof with verifier contract...");

      if (publicClient) {
        const isValid = await publicClient.readContract({
          address: VERIFIER_ADDRESS,
          abi: VERIFIER_ABI,
          functionName: "verifyProof",
          args: [
            proofForContract.a,
            proofForContract.b,
            proofForContract.c,
            proofForContract.input,
          ],
        });

        console.log("Verifier result:", isValid);

        if (!isValid) {
          setProofError(
            "Proof verification failed. The verifier rejected the proof."
          );
          setIsGeneratingProof(false);
          return;
        }

        setProofStatus("Proof valid! Submitting transaction...");
      }

      writeContract({
        address: MEDICAL_RECORD_ADDRESS,
        abi: MEDICAL_RECORD_ABI,
        functionName: "commitRecord",
        args: [
          proofForContract.a as [bigint, bigint],
          proofForContract.b as [[bigint, bigint], [bigint, bigint]],
          proofForContract.c as [bigint, bigint],
          proofForContract.input as [bigint],
        ],
      });

      setProofStatus("");
    } catch (error: any) {
      console.error("Proof generation error:", error);
      setProofError(error.message || "Failed to generate proof");
      setProofStatus("");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert className="max-w-md border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-200">
              Please connect your wallet to access the healthcare dashboard.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Alert className="max-w-md border-red-500/50 bg-red-500/10">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-200">
              Access Denied. You need Healthcare Provider role to access this
              dashboard.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Healthcare Provider Dashboard
              </span>
            </h1>
          </div>
          <p className="text-slate-300 text-xl max-w-3xl mx-auto">
            Manage patient records with zero-knowledge privacy on the blockchain
          </p>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            System Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Total Records</p>
                    <p className="text-3xl font-bold text-white">
                      {commitmentCount?.toString() || "0"}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">
                      Provider Address
                    </p>
                    <p className="text-sm font-mono text-white break-all">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Status</p>
                    <p className="text-xl font-bold text-white">
                      Verified Provider
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="records" className="mt-8">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <TabsTrigger
                value="records"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Medical Records
              </TabsTrigger>
              <TabsTrigger
                value="add-record"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Add Record
              </TabsTrigger>
              <TabsTrigger
                value="verify"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <Activity className="w-4 h-4 mr-2" />
                Verify Proofs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="records" className="mt-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Your Committed Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {commitments && commitments.length > 0 ? (
                      commitments.map((commit, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-slate-400 mb-1">
                                Commitment {idx + 1}
                              </p>
                              <p className="text-white font-mono text-sm break-all">
                                {commit}
                              </p>
                            </div>
                            <Shield className="w-5 h-5 text-green-400 flex-shrink-0 ml-2" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-center py-8">
                        No records committed yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add-record" className="mt-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Commit New Medical Record
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-blue-500/50 bg-blue-500/10">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-200 text-sm">
                      Place commitment.wasm and commitment_final.zkey in your
                      /public folder
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="recordData" className="text-white">
                      Record Data (Text)
                    </Label>
                    <Input
                      id="recordData"
                      value={recordData}
                      onChange={(e) => {
                        setRecordData(e.target.value);
                        if (e.target.value) setSelectedFile(null);
                      }}
                      placeholder="Enter patient record information"
                      disabled={!!selectedFile}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <p className="text-slate-400 text-xs">
                      Enter text data OR upload a file below
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-transparent px-2 text-slate-400">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="fileUpload"
                      className="text-white flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload File (Images, PDFs, Documents)
                    </Label>
                    <div className="relative">
                      <input
                        id="fileUpload"
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        disabled={!!recordData}
                        className="block w-full text-sm text-slate-400
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-gradient-to-r file:from-blue-500 file:to-cyan-500 file:text-white
                          file:hover:from-blue-600 file:hover:to-cyan-600
                          file:cursor-pointer
                          cursor-pointer
                          bg-slate-800 border border-slate-700 rounded-md
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    {selectedFile && (
                      <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <p className="text-slate-400 text-xs">
                      File will be hashed locally and a ZK proof will be
                      generated
                    </p>
                  </div>

                  {proofStatus && (
                    <Alert className="border-blue-500/50 bg-blue-500/10">
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                      <AlertDescription className="text-blue-200 text-sm">
                        {proofStatus}
                      </AlertDescription>
                    </Alert>
                  )}

                  {proofError && (
                    <Alert className="border-red-500/50 bg-red-500/10">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-200 text-sm">
                        {proofError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {isSuccess && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-200">
                        Record committed successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={generateAndSubmitProof}
                    disabled={
                      isGeneratingProof ||
                      isPending ||
                      isConfirming ||
                      (!recordData && !selectedFile)
                    }
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {isGeneratingProof ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Proof...
                      </>
                    ) : isPending || isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isPending ? "Confirming..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Commit Record
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verify" className="mt-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Verify Commitment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifyCommitment" className="text-white">
                      Commitment Hash
                    </Label>
                    <Input
                      id="verifyCommitment"
                      value={verifyCommitment}
                      onChange={(e) => setVerifyCommitment(e.target.value)}
                      placeholder="Enter commitment hash (0x...)"
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {verifyCommitment && (
                    <Alert
                      className={
                        isValidCommitment
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-red-500/50 bg-red-500/10"
                      }
                    >
                      {isValidCommitment ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-green-200">
                            Valid commitment found on-chain
                          </AlertDescription>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <AlertDescription className="text-red-200">
                            Commitment not found or invalid
                          </AlertDescription>
                        </>
                      )}
                    </Alert>
                  )}

                  {!verifyCommitment && (
                    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-slate-400 text-sm">
                        Enter a commitment hash to verify its existence on the
                        blockchain. You can copy commitment hashes from the
                        "Medical Records" tab.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default HealthcareDashboard;
