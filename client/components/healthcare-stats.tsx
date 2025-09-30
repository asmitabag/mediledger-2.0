"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Shield, Users, Activity } from "lucide-react"

export function HealthcareStats() {
  const stats = [
    {
      title: "Total Records",
      value: "1,247",
      change: "+12%",
      icon: FileText,
      color: "text-blue-400",
    },
    {
      title: "ZK Proofs Generated",
      value: "892",
      change: "+8%",
      icon: Shield,
      color: "text-green-400",
    },
    {
      title: "Active Patients",
      value: "456",
      change: "+5%",
      icon: Users,
      color: "text-purple-400",
    },
    {
      title: "Verifications",
      value: "234",
      change: "+15%",
      icon: Activity,
      color: "text-cyan-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
