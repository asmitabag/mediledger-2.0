"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Hospital, Shield, TrendingUp, AlertTriangle } from "lucide-react"

export function AdminStats() {
  const stats = [
    {
      title: "Total Users",
      value: "2,847",
      change: "+12%",
      icon: Users,
      color: "text-blue-400",
    },
    {
      title: "Manufacturers",
      value: "156",
      change: "+3%",
      icon: Building2,
      color: "text-green-400",
    },
    {
      title: "Healthcare Providers",
      value: "892",
      change: "+8%",
      icon: Hospital,
      color: "text-purple-400",
    },
    {
      title: "Active Roles",
      value: "1,234",
      change: "+5%",
      icon: Shield,
      color: "text-cyan-400",
    },
    {
      title: "System Health",
      value: "99.9%",
      change: "+0.1%",
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      title: "Pending Issues",
      value: "3",
      change: "-2",
      icon: AlertTriangle,
      color: "text-yellow-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/70">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <p className="text-xs text-green-400">{stat.change} from last month</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
