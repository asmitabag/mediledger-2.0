"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useReadContract } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Copy,
  Brain,
  Activity,
  MapPin,
  Thermometer,
  RefreshCw,
  QrCode,
} from "lucide-react";
import {
  formatAddress,
  formatTimestamp,
  getAddressUrl,
  copyToClipboard,
} from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "@/components/qr-scanner";
import { motion } from "framer-motion";
import type { DrugBatch } from "@/types/contracts";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";

interface StructuredAnalysis {
  riskScore: number;
  executiveSummary: string;
  criticalIssues: string;
  warnings: string;
  observations: string;
  complianceStatus: string;
  recommendations: string;
}

interface AnomalyAnalysis {
  analysis: string;
  riskScore: number;
  timestamp: string;
  structured?: StructuredAnalysis;
}

interface TransferRecord {
  from: string;
  to: string;
  timestamp: string;
  location: string;
  temperature: number;
  condition: string;
  transactionHash: string;
}

const handleCopy = (text: string) => {
  copyToClipboard(text);
};

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [batchId, setBatchId] = useState("");
  const [queriedBatchId, setQueriedBatchId] = useState<`0x${string}` | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [anomalyAnalysis, setAnomalyAnalysis] =
    useState<AnomalyAnalysis | null>(null);
  const [analyzingAnomalies, setAnalyzingAnomalies] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);

  // Read batch data from contract
  const {
    data: contractBatchData,
    isLoading: isFetchingBatch,
    error: contractError,
    refetch: refetchBatch,
  } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: queriedBatchId ? [queriedBatchId] : undefined,
    query: {
      enabled: !!queriedBatchId,
    },
  });

  // Read transfer history from contract
  const { data: contractTransferHistory, refetch: refetchHistory } =
    useReadContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "getTransferHistory",
      args: queriedBatchId ? [queriedBatchId] : undefined,
      query: {
        enabled: !!queriedBatchId,
      },
    });

  useEffect(() => {
    const batchParam = searchParams.get("batch");
    if (batchParam) {
      setBatchId(batchParam);
      handleVerify(batchParam);
    }
  }, [searchParams]);

  // Process contract data when it arrives
  useEffect(() => {
    if (contractBatchData) {
      setIsLoading(false);
      setError(null);

      // Process transfer history if available
      if (contractTransferHistory && Array.isArray(contractTransferHistory)) {
        const formattedHistory: TransferRecord[] = contractTransferHistory.map(
          (transfer: any) => ({
            from: transfer.from || "Unknown",
            to: transfer.to || "Unknown",
            timestamp: transfer.timestamp
              ? new Date(Number(transfer.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            location: transfer.location || "Unknown",
            temperature: 22, // Not in contract, using default
            condition: "Good", // Not in contract, using default
            transactionHash: "0x...", // Not stored in contract
          })
        );
        setTransferHistory(formattedHistory);
      } else {
        // If no transfer history, show empty array
        setTransferHistory([]);
      }
    }
  }, [contractBatchData, contractTransferHistory]);

  // Handle contract errors
  useEffect(() => {
    if (contractError) {
      setIsLoading(false);
      setError(
        "Failed to fetch batch data from blockchain. Please check the batch ID and try again."
      );
      toast({
        title: "Error",
        description: "Could not fetch batch data from blockchain",
        variant: "destructive",
      });
    }
  }, [contractError]);

  const handleVerify = async (id?: string) => {
    const targetId = id || batchId;
    if (!targetId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a batch ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnomalyAnalysis(null);

    // Set the batch ID to query from contract
    setQueriedBatchId(targetId as `0x${string}`);

    // The useReadContract hooks will automatically fetch when queriedBatchId is set
  };

  const handleQRScan = (result: string) => {
    setBatchId(result);
    setShowQRScanner(false);
    handleVerify(result);
  };

  const analyzeAnomalies = async () => {
    if (!contractBatchData) return;

    try {
      setAnalyzingAnomalies(true);

      const batchDataForAnalysis = contractBatchData as DrugBatch;

      const response = await fetch("/api/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchData: {
            batchId: batchDataForAnalysis.batchId,
            drugName: batchDataForAnalysis.drugName,
            manufacturer: formatAddress(batchDataForAnalysis.manufacturer),
            manufacturingDate: formatTimestamp(
              batchDataForAnalysis.manufacturingDate
            ),
            expiryDate: formatTimestamp(batchDataForAnalysis.expiryDate),
            quantity: 10000,
          },
          transferHistory,
          medicalRecords: [],
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setAnomalyAnalysis(analysis);
      }
    } catch (error) {
      console.error("Error analyzing anomalies:", error);
      toast({
        title: "Error",
        description: "Failed to analyze batch for anomalies",
        variant: "destructive",
      });
    } finally {
      setAnalyzingAnomalies(false);
    }
  };

  const getBatchStatus = (batch: DrugBatch) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (!batch.isActive) {
      return {
        label: "Inactive",
        variant: "destructive" as const,
        icon: XCircle,
        description: "This batch has been deactivated",
      };
    }
    if (batch.expiryDate < now) {
      return {
        label: "Expired",
        variant: "secondary" as const,
        icon: AlertTriangle,
        description: "This batch has expired",
      };
    }
    return {
      label: "Valid",
      variant: "default" as const,
      icon: CheckCircle2,
      description: "This batch is active and valid",
    };
  };

  const getRiskBadgeColor = (score: number) => {
    if (score <= 3) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score <= 6)
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  // Cast contract data to DrugBatch type for rendering
  const batchData = contractBatchData as DrugBatch | null;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Drug Verification
              </span>
            </h1>
          </div>
          <p className="text-slate-300 text-lg">
            Verify pharmaceutical authenticity and track supply chain history
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glassmorphism border-slate-700 mb-8">
            <CardHeader>
              <CardTitle>Enter Batch ID</CardTitle>
              <CardDescription>
                Enter the batch ID to verify drug authenticity or scan QR code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                <Input
                  placeholder="0x..."
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white font-mono"
                />
                <Button
                  onClick={() => handleVerify()}
                  disabled={isLoading || isFetchingBatch}
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading || isFetchingBatch ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowQRScanner(true)}
                  className="border-slate-600 hover:bg-slate-800"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan QR
                </Button>
              </div>

              {showQRScanner && (
                <div className="mt-4">
                  <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowQRScanner(false)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 mb-8">
            <XCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {batchData && (
          <div className="space-y-6">
            {/* Rest of your UI remains exactly the same */}
            <Card className="glassmorphism border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {batchData.drugName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = getBatchStatus(batchData);
                      return (
                        <>
                          <status.icon className="w-5 h-5 text-green-500" />
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <CardDescription>
                  {getBatchStatus(batchData).description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Batch ID</label>
                    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded border font-mono text-sm">
                      <span className="flex-1">{batchData.batchId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(batchData.batchId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      Manufacturer
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded border font-mono text-sm">
                      <span className="flex-1">
                        {formatAddress(batchData.manufacturer)}
                      </span>
                      <a
                        href={getAddressUrl(batchData.manufacturer)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      Manufacturing Date
                    </label>
                    <div className="p-2 bg-slate-800 rounded border text-sm">
                      {formatTimestamp(batchData.manufacturingDate)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      Expiry Date
                    </label>
                    <div className="p-2 bg-slate-800 rounded border text-sm">
                      {formatTimestamp(batchData.expiryDate)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      Current Owner
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-slate-800 rounded border font-mono text-sm">
                      <span className="flex-1">
                        {formatAddress(batchData.currentOwner)}
                      </span>
                      <a
                        href={getAddressUrl(batchData.currentOwner)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supply Chain History - same as before */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glassmorphism border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Supply Chain History
                  </CardTitle>
                  <CardDescription>
                    Complete transfer history for this batch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transferHistory.length > 0 ? (
                    <div className="space-y-4">
                      {transferHistory.map((transfer, index) => (
                        <div key={index} className="relative">
                          {index < transferHistory.length - 1 && (
                            <div className="absolute left-4 top-8 w-0.5 h-16 bg-gradient-to-b from-purple-400 to-cyan-400"></div>
                          )}
                          <div className="flex items-start space-x-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center justify-center flex-shrink-0">
                              <div className="w-3 h-3 rounded-full bg-white"></div>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white font-medium">
                                  {formatAddress(
                                    transfer.from as `0x${string}`
                                  )}{" "}
                                  →{" "}
                                  {formatAddress(transfer.to as `0x${string}`)}
                                </h4>
                                <span className="text-sm text-gray-400">
                                  {new Date(
                                    transfer.timestamp
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                <div className="flex items-center text-gray-300">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {transfer.location}
                                </div>
                                <div className="flex items-center text-gray-300">
                                  <Thermometer className="h-4 w-4 mr-1" />
                                  {transfer.temperature}°C
                                </div>
                                <div className="flex items-center text-gray-300">
                                  <Shield className="h-4 w-4 mr-1" />
                                  {transfer.condition}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2 font-mono">
                                Tx: {transfer.transactionHash}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">No Transfer History</p>
                      <p className="text-sm text-slate-500">
                        This batch has not been transferred yet or transfer
                        history is not available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Anomaly Detection - same as before */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glassmorphism border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Brain className="h-5 w-5 mr-2" />
                      AI Anomaly Detection
                    </div>
                    <Button
                      onClick={analyzeAnomalies}
                      disabled={analyzingAnomalies}
                      className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                    >
                      {analyzingAnomalies ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        "Run Analysis"
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis to detect potential anomalies in the
                    supply chain
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {anomalyAnalysis ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/80 to-slate-700/80 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                              anomalyAnalysis.riskScore <= 3
                                ? "bg-green-500/20 text-green-400 border-2 border-green-500"
                                : anomalyAnalysis.riskScore <= 6
                                ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500"
                                : "bg-red-500/20 text-red-400 border-2 border-red-500"
                            }`}
                          >
                            {anomalyAnalysis.riskScore}
                          </div>
                          <div>
                            <h4 className="text-white font-semibold text-lg">
                              Risk Assessment
                            </h4>
                            <p className="text-sm text-slate-400">
                              {anomalyAnalysis.riskScore <= 3
                                ? "Low Risk"
                                : anomalyAnalysis.riskScore <= 6
                                ? "Medium Risk"
                                : "High Risk"}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={getRiskBadgeColor(
                            anomalyAnalysis.riskScore
                          )}
                        >
                          {anomalyAnalysis.riskScore}/10
                        </Badge>
                      </div>

                      {anomalyAnalysis.structured && (
                        <>
                          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                              Executive Summary
                            </h4>
                            <p className="text-slate-300 text-sm leading-relaxed">
                              {anomalyAnalysis.structured.executiveSummary}
                            </p>
                          </div>

                          {anomalyAnalysis.structured.criticalIssues !==
                            "None identified" && (
                            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Critical Issues
                              </h4>
                              <div className="text-red-200 text-sm leading-relaxed whitespace-pre-line">
                                {anomalyAnalysis.structured.criticalIssues}
                              </div>
                            </div>
                          )}

                          {anomalyAnalysis.structured.warnings !==
                            "None identified" && (
                            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                              <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Warnings
                              </h4>
                              <div className="text-yellow-200 text-sm leading-relaxed whitespace-pre-line">
                                {anomalyAnalysis.structured.warnings}
                              </div>
                            </div>
                          )}

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-cyan-400" />
                                Observations
                              </h4>
                              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                {anomalyAnalysis.structured.observations}
                              </div>
                            </div>

                            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-400" />
                                Compliance Status
                              </h4>
                              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                                {anomalyAnalysis.structured.complianceStatus}
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg p-4 border border-purple-500/30">
                            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-purple-400" />
                              Recommendations
                            </h4>
                            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                              {anomalyAnalysis.structured.recommendations}
                            </div>
                          </div>
                        </>
                      )}

                      <details className="bg-slate-800/30 rounded-lg border border-slate-700">
                        <summary className="cursor-pointer p-4 text-sm text-slate-400 hover:text-slate-300 transition-colors">
                          View Full Analysis Report
                        </summary>
                        <div className="px-4 pb-4">
                          <pre className="text-slate-300 whitespace-pre-wrap text-xs font-mono">
                            {anomalyAnalysis.analysis}
                          </pre>
                        </div>
                      </details>

                      <p className="text-xs text-slate-500 text-center">
                        Analysis completed:{" "}
                        {new Date(anomalyAnalysis.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">
                        AI-Powered Supply Chain Analysis
                      </p>
                      <p className="text-sm text-slate-500">
                        Click "Run Analysis" to detect potential anomalies,
                        suspicious patterns, and compliance violations
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
