"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Shield,
  BarChart3,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  UserPlus,
  AlertCircle,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";
import {
  MEDICAL_RECORD_ADDRESS,
  MEDICAL_RECORD_ABI,
} from "@/lib/contracts/MedicalRecord";
import { RoleManagement } from "@/components/role-management";

export default function AdminDashboard() {
  const { address, isConnected, chain } = useAccount();
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [distributorAddress, setDistributorAddress] = useState("");
  const [healthcareAddress, setHealthcareAddress] = useState("");
  const [mlLoggerAddress, setMlLoggerAddress] = useState("");
  const [mounted, setMounted] = useState(false);

  const DEFAULT_ADMIN_ROLE =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: isAdmin,
    isLoading: roleLoading,
    error: roleError,
  } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "hasRole",
    args: address ? [DEFAULT_ADMIN_ROLE as `0x${string}`, address] : undefined,
    query: {
      enabled: !!address && mounted,
    },
  });

  const { data: allBatchIds } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
    query: {
      enabled: mounted,
    },
  });

  // Debug logging
  useEffect(() => {
    if (mounted && address) {
      console.log("=== ADMIN ACCESS DEBUG ===");
      console.log("Connected Wallet:", address);
      console.log("Connected Network:", chain?.name, "ID:", chain?.id);
      console.log("Contract Address:", DRUG_REGISTRY_ADDRESS);
      console.log("Checking Admin Role:", DEFAULT_ADMIN_ROLE);
      console.log("Has Admin Role:", isAdmin);
      console.log("Role Check Loading:", roleLoading);
      console.log("Role Check Error:", roleError);
      console.log("========================");
    }
  }, [address, isAdmin, roleLoading, roleError, mounted, chain]);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      setManufacturerAddress("");
      setDistributorAddress("");
      setHealthcareAddress("");
      setMlLoggerAddress("");
    }
  }, [isSuccess]);

  const handleAddManufacturer = () => {
    if (!manufacturerAddress) return;
    writeContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "addManufacturer",
      args: [manufacturerAddress as `0x${string}`],
    });
  };

  const handleAddDistributor = () => {
    if (!distributorAddress) return;
    writeContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "addDistributor",
      args: [distributorAddress as `0x${string}`],
    });
  };

  const handleAddHealthcare = () => {
    if (!healthcareAddress) return;
    writeContract({
      address: MEDICAL_RECORD_ADDRESS,
      abi: MEDICAL_RECORD_ABI,
      functionName: "addHealthcareProvider",
      args: [healthcareAddress as `0x${string}`],
    });
  };

  const handleAddMLLogger = () => {
    if (!mlLoggerAddress) return;
    writeContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "addMLLogger",
      args: [mlLoggerAddress as `0x${string}`],
    });
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
        <Alert className="max-w-md border-orange-500/50 bg-orange-500/10">
          <XCircle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-200">
            Please connect your wallet to access the admin dashboard.
          </AlertDescription>
        </Alert>
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

  if (roleError) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 bg-[length:20px_20px] bg-grid-white-100/10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-red-400">Contract Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200">
                  {roleError.message}
                </AlertDescription>
              </Alert>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Your Wallet:</p>
                  <p className="font-mono text-white text-xs break-all">
                    {address}
                  </p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Network:</p>
                  <p className="text-white">
                    {chain?.name || "Unknown"} (ID: {chain?.id})
                  </p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Contract:</p>
                  <p className="font-mono text-white text-xs break-all">
                    {DRUG_REGISTRY_ADDRESS}
                  </p>
                </div>
              </div>
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertDescription className="text-blue-200 text-sm">
                  <p className="font-semibold mb-2">Possible issues:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Wrong network (should be Sepolia)</li>
                    <li>Contract not deployed on this network</li>
                    <li>Incorrect contract address</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="max-w-2xl bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-red-400">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-500/50 bg-red-500/10">
                <XCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200">
                  You need Administrator role to access this dashboard.
                </AlertDescription>
              </Alert>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Your Wallet:</p>
                  <p className="font-mono text-white text-xs break-all">
                    {address}
                  </p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Network:</p>
                  <p className="text-white">
                    {chain?.name || "Unknown"} (ID: {chain?.id})
                  </p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Contract:</p>
                  <p className="font-mono text-white text-xs break-all">
                    {DRUG_REGISTRY_ADDRESS}
                  </p>
                </div>
                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <p className="text-slate-400 mb-1">Admin Role Hash:</p>
                  <p className="font-mono text-white text-xs break-all">
                    {DEFAULT_ADMIN_ROLE}
                  </p>
                </div>
              </div>
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertDescription className="text-blue-200 text-sm">
                  <p className="font-semibold mb-2">Debug Information:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check browser console for detailed logs</li>
                    <li>Verify you're using the deployer wallet</li>
                    <li>Confirm contract is deployed on {chain?.name}</li>
                    <li>Try disconnecting and reconnecting wallet</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
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
                Admin Dashboard
              </span>
            </h1>
          </div>
          <p className="text-slate-300 text-xl max-w-3xl mx-auto">
            System administration and user management for MediLedger 2.0
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Total Batches</p>
                    <p className="text-3xl font-bold text-white">
                      {allBatchIds?.length || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Network</p>
                    <p className="text-xl font-bold text-white">
                      {chain?.name || "Unknown"}
                    </p>
                  </div>
                  <Globe className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Admin Address</p>
                    <p className="text-sm font-mono text-white break-all">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Status</p>
                    <p className="text-xl font-bold text-white">Active</p>
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
          <Tabs defaultValue="users" className="mt-8">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700">
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger
                value="roles"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Roles
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                Audit Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    User Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="text-white font-semibold mb-4">
                      Add Manufacturer
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        value={manufacturerAddress}
                        onChange={(e) => setManufacturerAddress(e.target.value)}
                        placeholder="Enter address (0x...)"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 flex-1"
                      />
                      <Button
                        onClick={handleAddManufacturer}
                        disabled={
                          isPending || isConfirming || !manufacturerAddress
                        }
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="text-white font-semibold mb-4">
                      Add Distributor
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        value={distributorAddress}
                        onChange={(e) => setDistributorAddress(e.target.value)}
                        placeholder="Enter address (0x...)"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 flex-1"
                      />
                      <Button
                        onClick={handleAddDistributor}
                        disabled={
                          isPending || isConfirming || !distributorAddress
                        }
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="text-white font-semibold mb-4">
                      Add Healthcare Provider
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        value={healthcareAddress}
                        onChange={(e) => setHealthcareAddress(e.target.value)}
                        placeholder="Enter address (0x...)"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 flex-1"
                      />
                      <Button
                        onClick={handleAddHealthcare}
                        disabled={
                          isPending || isConfirming || !healthcareAddress
                        }
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <h3 className="text-white font-semibold mb-4">
                      Add ML Logger
                    </h3>
                    <div className="flex gap-2">
                      <Input
                        value={mlLoggerAddress}
                        onChange={(e) => setMlLoggerAddress(e.target.value)}
                        placeholder="Enter address (0x...)"
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 flex-1"
                      />
                      <Button
                        onClick={handleAddMLLogger}
                        disabled={isPending || isConfirming || !mlLoggerAddress}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {isPending || isConfirming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isSuccess && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-200">
                        Role granted successfully! Tx: {hash?.slice(0, 10)}...
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
              <RoleManagement />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <AnalyticsTab allBatchIds={allBatchIds} />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <AuditLogsTab allBatchIds={allBatchIds} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

function AnalyticsTab({ allBatchIds }: { allBatchIds?: readonly string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            System Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">
                      Total Batches Registered
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {allBatchIds?.length || 0}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">System Status</p>
                    <p className="text-3xl font-bold text-white">Active</p>
                  </div>
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AuditLogsTab({ allBatchIds }: { allBatchIds?: readonly string[] }) {
  const [selectedBatch, setSelectedBatch] = useState("");

  const { data: anomalyLogs } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAnomalyLogs",
    args: selectedBatch ? [selectedBatch as `0x${string}`] : undefined,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Select Batch</Label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full p-2 rounded bg-slate-800 border-slate-700 text-white focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select a batch...</option>
              {allBatchIds?.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          {selectedBatch && anomalyLogs && anomalyLogs.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {anomalyLogs.map((log, idx) => {
                const [
                  batchId,
                  predictionHash,
                  logger,
                  timestamp,
                  anomalyType,
                ] = log;
                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-semibold">
                        {anomalyType}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {new Date(Number(timestamp) * 1000).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Logger:{" "}
                      <span className="font-mono">
                        {logger.slice(0, 10)}...{logger.slice(-8)}
                      </span>
                    </p>
                    <p className="text-slate-400 text-sm">
                      Prediction:{" "}
                      <span className="font-mono">
                        {predictionHash.slice(0, 20)}...
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          ) : selectedBatch ? (
            <p className="text-slate-400 text-center py-8">
              No anomaly logs for this batch
            </p>
          ) : (
            <p className="text-slate-400 text-center py-8">
              Select a batch to view logs
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
