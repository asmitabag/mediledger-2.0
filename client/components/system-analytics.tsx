"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

export function SystemAnalytics() {
  // Mock data for charts
  const userGrowthData = [
    { month: "Jan", users: 400 },
    { month: "Feb", users: 600 },
    { month: "Mar", users: 800 },
    { month: "Apr", users: 1200 },
    { month: "May", users: 1600 },
    { month: "Jun", users: 2000 },
  ]

  const transactionData = [
    { day: "Mon", transactions: 120 },
    { day: "Tue", transactions: 190 },
    { day: "Wed", transactions: 300 },
    { day: "Thu", transactions: 250 },
    { day: "Fri", transactions: 400 },
    { day: "Sat", transactions: 200 },
    { day: "Sun", transactions: 150 },
  ]

  const roleDistribution = [
    { name: "Healthcare Providers", value: 45, color: "#8B5CF6" },
    { name: "Manufacturers", value: 25, color: "#06B6D4" },
    { name: "Distributors", value: 20, color: "#10B981" },
    { name: "Admins", value: 10, color: "#F59E0B" },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">User Growth</CardTitle>
          <CardDescription className="text-white/70">Monthly user registration trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Daily Transactions</CardTitle>
          <CardDescription className="text-white/70">Blockchain transaction volume</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.7)" />
              <YAxis stroke="rgba(255,255,255,0.7)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Bar dataKey="transactions" fill="#06B6D4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Role Distribution</CardTitle>
          <CardDescription className="text-white/70">User roles across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">System Metrics</CardTitle>
          <CardDescription className="text-white/70">Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Average Response Time</span>
              <span className="text-white font-bold">120ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Success Rate</span>
              <span className="text-green-400 font-bold">99.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Active Sessions</span>
              <span className="text-white font-bold">1,247</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Storage Used</span>
              <span className="text-white font-bold">2.4 TB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Network Health</span>
              <span className="text-green-400 font-bold">Excellent</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
