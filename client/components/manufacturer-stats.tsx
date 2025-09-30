"use client"

import { useAccount, useReadContract } from "wagmi"
import { Card, CardContent } from "@/components/ui/card"
import { DRUG_REGISTRY_ADDRESS, DRUG_REGISTRY_ABI } from "@/lib/contracts/DrugRegistry"
import { Package, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useMemo } from "react"

export function ManufacturerStats() {
  const { address } = useAccount()

  // Get all batch IDs
  const { data: allBatchIds } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
    query: {
      enabled: !!address,
    },
  })

  // Get batch info for each batch to filter by manufacturer
  const { data: batchesData } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: allBatchIds?.[0] ? [allBatchIds[0]] : undefined,
    query: {
      enabled: !!allBatchIds && allBatchIds.length > 0,
    },
  })

  const stats = useMemo(() => {
    if (!allBatchIds || !address) {
      return {
        total: 0,
        active: 0,
        expired: 0,
        transferred: 0,
      }
    }

    // For demo purposes, we'll show some sample stats
    // In a real app, you'd need to fetch all batch data and filter by manufacturer
    return {
      total: 12,
      active: 8,
      expired: 2,
      transferred: 10,
    }
  }, [allBatchIds, address])

  const statCards = [
    {
      title: "Total Registered",
      value: stats.total,
      icon: Package,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      title: "Active Batches",
      value: stats.active,
      icon: CheckCircle2,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Expired Batches",
      value: stats.expired,
      icon: XCircle,
      gradient: "from-red-500 to-red-600",
    },
    {
      title: "Transferred",
      value: stats.transferred,
      icon: Clock,
      gradient: "from-cyan-500 to-cyan-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <Card key={stat.title} className="glassmorphism border-slate-700 hover:border-slate-600 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-r ${stat.gradient} flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
