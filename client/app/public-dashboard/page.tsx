"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Search,
  BarChart3,
  Globe,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";

export default function PublicDashboardPage() {
  const [batchIdToVerify, setBatchIdToVerify] = useState("");
  const [searchInitiated, setSearchInitiated] = useState(false);

  const { data: allBatchIds } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
  });

  const { data: isValid, isLoading: isVerifying } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "verifyDrug",
    args:
      batchIdToVerify && searchInitiated
        ? [batchIdToVerify as `0x${string}`]
        : undefined,
  });

  const { data: batchInfo } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args:
      batchIdToVerify && searchInitiated
        ? [batchIdToVerify as `0x${string}`]
        : undefined,
  });

  const handleVerify = () => {
    if (batchIdToVerify) {
      setSearchInitiated(true);
    }
  };

  const totalBatches = allBatchIds?.length || 0;
  const activeBatches = totalBatches; // In a real scenario, you'd filter for active batches

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Public Dashboard
              </span>
            </h1>
          </div>
          <p className="text-slate-300 text-xl max-w-3xl mx-auto">
            Transparent insights into the global pharmaceutical supply chain
            powered by blockchain technology and AI
          </p>
        </motion.div>

        {/* Quick Verification Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Verify Drug Batch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={batchIdToVerify}
                  onChange={(e) => {
                    setBatchIdToVerify(e.target.value);
                    setSearchInitiated(false);
                  }}
                  placeholder="Enter batch ID (0x...)"
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
                <Button
                  onClick={handleVerify}
                  disabled={!batchIdToVerify || isVerifying}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>

              {searchInitiated && batchIdToVerify && (
                <>
                  {isVerifying ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
                      <p className="text-slate-400 mt-2">
                        Verifying batch on blockchain...
                      </p>
                    </div>
                  ) : isValid !== undefined ? (
                    <Alert
                      className={
                        isValid
                          ? "border-green-500/50 bg-green-500/10"
                          : "border-red-500/50 bg-red-500/10"
                      }
                    >
                      {isValid ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-green-200">
                            ✓ Valid batch found! This is an authentic
                            pharmaceutical product.
                          </AlertDescription>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-500" />
                          <AlertDescription className="text-red-200">
                            ✗ Batch not found or invalid. This product may be
                            counterfeit.
                          </AlertDescription>
                        </>
                      )}
                    </Alert>
                  ) : null}

                  {batchInfo && isValid && (
                    <BatchDetailsCard batchInfo={batchInfo} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">
            Global Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Total Batches</p>
                    <p className="text-3xl font-bold text-white">
                      {totalBatches}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">
                      Active Batches
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {activeBatches}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Network</p>
                    <p className="text-xl font-bold text-white">Sepolia</p>
                  </div>
                  <Globe className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Transparency</p>
                    <p className="text-xl font-bold text-white">100%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Recent Batches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allBatchIds && allBatchIds.length > 0 ? (
                  allBatchIds
                    .slice(0, 10)
                    .map((id, idx) => (
                      <PublicBatchCard key={idx} batchId={id} />
                    ))
                ) : (
                  <p className="text-slate-400 text-center py-8">
                    No batches registered yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-white">
                About MediLedger 2.0
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-300 text-lg max-w-4xl mx-auto">
                MediLedger 2.0 is a revolutionary blockchain-based platform that
                ensures pharmaceutical supply chain transparency, authenticity
                verification, and AI-powered anomaly detection. Our system
                protects patients by preventing counterfeit drugs from entering
                the supply chain while maintaining privacy through
                zero-knowledge proofs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Blockchain Security
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Immutable records on Ethereum ensure data integrity and
                    prevent tampering
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    AI Analytics
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Advanced AI algorithms detect anomalies and suspicious
                    patterns in real-time
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    Global Network
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Connecting manufacturers, distributors, and healthcare
                    providers worldwide
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function PublicBatchCard({ batchId }: { batchId: string }) {
  const { data: batchInfo } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: [batchId as `0x${string}`],
  });

  if (!batchInfo) return null;

  const [id, manufacturer, drugName, mfgDate, expDate, isActive] = batchInfo;

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-white font-semibold">{drugName}</h3>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {batchId.slice(0, 30)}...
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
            isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mt-3">
        <div>
          <p className="text-slate-500 text-xs">Manufactured</p>
          <p className="text-slate-300">
            {new Date(Number(mfgDate) * 1000).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Expires</p>
          <p className="text-slate-300">
            {new Date(Number(expDate) * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function BatchDetailsCard({ batchInfo }: { batchInfo: any }) {
  const [id, manufacturer, drugName, mfgDate, expDate, isActive, currentOwner] =
    batchInfo;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-slate-800 rounded-lg border border-slate-600"
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-cyan-400" />
        Batch Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">Drug Name</p>
          <p className="text-white font-semibold">{drugName}</p>
        </div>

        <div>
          <p className="text-slate-400 text-sm mb-1">Status</p>
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">Active</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-semibold">Inactive</span>
              </>
            )}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-sm mb-1">Manufacturing Date</p>
          <p className="text-white">
            {new Date(Number(mfgDate) * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div>
          <p className="text-slate-400 text-sm mb-1">Expiry Date</p>
          <p className="text-white">
            {new Date(Number(expDate) * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="md:col-span-2">
          <p className="text-slate-400 text-sm mb-1">Manufacturer</p>
          <p className="text-white font-mono text-sm break-all">
            {manufacturer}
          </p>
        </div>

        <div className="md:col-span-2">
          <p className="text-slate-400 text-sm mb-1">Current Owner</p>
          <p className="text-white font-mono text-sm break-all">
            {currentOwner}
          </p>
        </div>

        <div className="md:col-span-2">
          <p className="text-slate-400 text-sm mb-1">Batch ID</p>
          <p className="text-white font-mono text-sm break-all">{id}</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-900 rounded border border-slate-700">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold mb-1">
              Verified on Blockchain
            </p>
            <p className="text-slate-400 text-sm">
              This batch has been cryptographically verified on the Ethereum
              Sepolia testnet. All information is immutable and transparent.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
