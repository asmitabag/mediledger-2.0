"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Thermometer,
  Package,
  Activity,
  Brain,
  RefreshCw,
} from "lucide-react"
import { motion } from "framer-motion"

interface BatchData {
  batchId: string
  drugName: string
  manufacturer: string
  manufacturingDate: string
  expiryDate: string
  quantity: number
  currentOwner: string
  status: string
}

interface TransferRecord {
  from: string
  to: string
  timestamp: string
  location: string
  temperature: number
  condition: string
  transactionHash: string
}

interface AnomalyAnalysis {
  analysis: string
  riskScore: number
  timestamp: string
}

export default function BatchVerificationPage() {
  const params = useParams()
  const batchId = params.batchId as string

  const [batchData, setBatchData] = useState<BatchData | null>(null)
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([])
  const [anomalyAnalysis, setAnomalyAnalysis] = useState<AnomalyAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzingAnomalies, setAnalyzingAnomalies] = useState(false)

  useEffect(() => {
    fetchBatchData()
  }, [batchId])

  const fetchBatchData = async () => {
    try {
      setLoading(true)

      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockBatchData: BatchData = {
        batchId,
        drugName: "Amoxicillin 500mg",
        manufacturer: "PharmaCorp Ltd.",
        manufacturingDate: "2024-01-15",
        expiryDate: "2026-01-15",
        quantity: 10000,
        currentOwner: "City General Hospital",
        status: "Delivered",
      }

      const mockTransferHistory: TransferRecord[] = [
        {
          from: "PharmaCorp Ltd.",
          to: "MedDistribute Inc.",
          timestamp: "2024-01-20T10:00:00Z",
          location: "New York, NY",
          temperature: 22,
          condition: "Good",
          transactionHash: "0x1234...abcd",
        },
        {
          from: "MedDistribute Inc.",
          to: "Regional Pharmacy Chain",
          timestamp: "2024-01-25T14:30:00Z",
          location: "Boston, MA",
          temperature: 24,
          condition: "Good",
          transactionHash: "0x5678...efgh",
        },
        {
          from: "Regional Pharmacy Chain",
          to: "City General Hospital",
          timestamp: "2024-01-30T09:15:00Z",
          location: "Boston, MA",
          temperature: 23,
          condition: "Good",
          transactionHash: "0x9abc...ijkl",
        },
      ]

      setBatchData(mockBatchData)
      setTransferHistory(mockTransferHistory)
    } catch (error) {
      console.error("Error fetching batch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeAnomalies = async () => {
    if (!batchData) return

    try {
      setAnalyzingAnomalies(true)

      const response = await fetch("/api/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchData,
          transferHistory,
          medicalRecords: [],
        }),
      })

      if (response.ok) {
        const analysis = await response.json()
        setAnomalyAnalysis(analysis)
      }
    } catch (error) {
      console.error("Error analyzing anomalies:", error)
    } finally {
      setAnalyzingAnomalies(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 3) return "text-green-500"
    if (score <= 6) return "text-yellow-500"
    return "text-red-500"
  }

  const getRiskBadgeColor = (score: number) => {
    if (score <= 3) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (score <= 6) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    return "bg-red-500/20 text-red-400 border-red-500/30"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Verifying batch data...</p>
        </div>
      </div>
    )
  }

  if (!batchData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Batch Not Found</h2>
            <p className="text-gray-300">The batch ID "{batchId}" could not be verified.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Batch Verification</h1>
          <p className="text-gray-300">Comprehensive supply chain verification and analysis</p>
        </motion.div>

        {/* Verification Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-white">Batch Verified</h3>
                    <p className="text-gray-300">This batch is authentic and tracked on the blockchain</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">VERIFIED</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Batch Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Batch Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Batch ID</label>
                  <p className="text-white font-mono">{batchData.batchId}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Drug Name</label>
                  <p className="text-white">{batchData.drugName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Manufacturer</label>
                  <p className="text-white">{batchData.manufacturer}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Current Owner</label>
                  <p className="text-white">{batchData.currentOwner}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Manufacturing Date</label>
                  <p className="text-white">{new Date(batchData.manufacturingDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Expiry Date</label>
                  <p className="text-white">{new Date(batchData.expiryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Quantity</label>
                  <p className="text-white">{batchData.quantity.toLocaleString()} units</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{batchData.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transfer History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Supply Chain History
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                            {transfer.from} → {transfer.to}
                          </h4>
                          <span className="text-sm text-gray-400">
                            {new Date(transfer.timestamp).toLocaleDateString()}
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
                        <p className="text-xs text-gray-500 mt-2 font-mono">Tx: {transfer.transactionHash}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Anomaly Detection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
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
            </CardHeader>
            <CardContent>
              {anomalyAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Risk Assessment</h4>
                    <Badge className={getRiskBadgeColor(anomalyAnalysis.riskScore)}>
                      Risk Score: {anomalyAnalysis.riskScore}/10
                    </Badge>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <pre className="text-gray-300 whitespace-pre-wrap text-sm">{anomalyAnalysis.analysis}</pre>
                  </div>
                  <p className="text-xs text-gray-500">
                    Analysis completed: {new Date(anomalyAnalysis.timestamp).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">Click "Run Analysis" to detect potential anomalies using AI</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
