"use client"

import { useAccount } from "wagmi"
import { Card, CardContent } from "@/components/ui/card"
import { Package, ArrowRight, Clock, MapPin } from "lucide-react"

export function DistributorStats() {
  const { address } = useAccount()

  // Sample stats for demonstration
  const stats = {
    inPossession: 5,
    transferred: 23,
    inTransit: 2,
    locations: 8,
  }

  const statCards = [
    {
      title: "In Possession",
      value: stats.inPossession,
      icon: Package,
      gradient: "from-cyan-500 to-cyan-600",
    },
    {
      title: "Transferred",
      value: stats.transferred,
      icon: ArrowRight,
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "In Transit",
      value: stats.inTransit,
      icon: Clock,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      title: "Locations Served",
      value: stats.locations,
      icon: MapPin,
      gradient: "from-purple-500 to-purple-600",
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
