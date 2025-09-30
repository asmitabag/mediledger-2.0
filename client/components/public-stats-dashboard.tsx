"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Package, Building, Shield, TrendingUp, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { motion } from "framer-motion"

interface PublicStats {
  totalBatches: number
  verifiedBatches: number
  activeManufacturers: number
  totalTransfers: number
  averageRiskScore: number
  recentVerifications: number
  complianceRate: number
  anomaliesDetected: number
}

export function PublicStatsDashboard() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicStats()
  }, [])

  const fetchPublicStats = async () => {
    try {
      // Simulate API call for public statistics
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockStats: PublicStats = {
        totalBatches: 15847,
        verifiedBatches: 15623,
        activeManufacturers: 127,
        totalTransfers: 48392,
        averageRiskScore: 2.3,
        recentVerifications: 342,
        complianceRate: 98.6,
        anomaliesDetected: 23,
      }

      setStats(mockStats)
    } catch (error) {
      console.error("Error fetching public stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="glassmorphism border-slate-700">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-700 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: "Total Batches",
      value: stats.totalBatches.toLocaleString(),
      icon: Package,
      color: "from-blue-500 to-cyan-500",
      description: "Registered on blockchain",
    },
    {
      title: "Verified Batches",
      value: stats.verifiedBatches.toLocaleString(),
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
      description: "Successfully verified",
    },
    {
      title: "Active Manufacturers",
      value: stats.activeManufacturers.toLocaleString(),
      icon: Building,
      color: "from-purple-500 to-violet-500",
      description: "Registered manufacturers",
    },
    {
      title: "Total Transfers",
      value: stats.totalTransfers.toLocaleString(),
      icon: Activity,
      color: "from-orange-500 to-red-500",
      description: "Supply chain movements",
    },
    {
      title: "Average Risk Score",
      value: stats.averageRiskScore.toFixed(1),
      icon: Shield,
      color: "from-cyan-500 to-blue-500",
      description: "AI risk assessment",
    },
    {
      title: "Recent Verifications",
      value: stats.recentVerifications.toLocaleString(),
      icon: TrendingUp,
      color: "from-green-500 to-teal-500",
      description: "Last 24 hours",
    },
    {
      title: "Compliance Rate",
      value: `${stats.complianceRate}%`,
      icon: CheckCircle,
      color: "from-emerald-500 to-green-500",
      description: "Regulatory compliance",
    },
    {
      title: "Anomalies Detected",
      value: stats.anomaliesDetected.toLocaleString(),
      icon: AlertTriangle,
      color: "from-yellow-500 to-orange-500",
      description: "AI-detected issues",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Platform Statistics</h2>
        <p className="text-slate-300">Real-time insights into the MediLedger network</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="glassmorphism border-slate-700 hover:border-slate-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.title === "Compliance Rate" && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Excellent</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                  <p className="text-sm font-medium text-slate-300">{stat.title}</p>
                  <p className="text-xs text-slate-500">{stat.description}</p>
                </div>
                {stat.title === "Compliance Rate" && (
                  <div className="mt-4">
                    <Progress value={stats.complianceRate} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="glassmorphism border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Network Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Verification Success Rate</span>
              <span className="text-green-400 font-semibold">
                {((stats.verifiedBatches / stats.totalBatches) * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={(stats.verifiedBatches / stats.totalBatches) * 100} className="h-2" />

            <div className="flex justify-between items-center">
              <span className="text-slate-300">Average Daily Verifications</span>
              <span className="text-blue-400 font-semibold">{stats.recentVerifications}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-300">Risk Assessment Score</span>
              <Badge
                className={
                  stats.averageRiskScore <= 3
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : stats.averageRiskScore <= 6
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              >
                {stats.averageRiskScore}/10
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Anomalies Detection Rate</span>
              <span className="text-orange-400 font-semibold">
                {((stats.anomaliesDetected / stats.totalBatches) * 100).toFixed(2)}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-300">Active Monitoring</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">24/7</Badge>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-300">AI Analysis Coverage</span>
              <span className="text-purple-400 font-semibold">100%</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-300">Blockchain Confirmations</span>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
