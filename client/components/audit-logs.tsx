"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download } from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  status: "success" | "failed" | "warning"
  details: string
}

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Mock audit log data
  const auditLogs: AuditLog[] = [
    {
      id: "1",
      timestamp: "2024-01-20 14:30:25",
      user: "0x1234...5678",
      action: "CREATE_BATCH",
      resource: "DrugRegistry",
      status: "success",
      details: "Created batch BATCH-001 for Aspirin",
    },
    {
      id: "2",
      timestamp: "2024-01-20 14:25:12",
      user: "0x2345...6789",
      action: "TRANSFER_BATCH",
      resource: "DrugRegistry",
      status: "success",
      details: "Transferred batch BATCH-001 to distributor",
    },
    {
      id: "3",
      timestamp: "2024-01-20 14:20:45",
      user: "0x3456...7890",
      action: "ADD_MEDICAL_RECORD",
      resource: "MedicalRecord",
      status: "success",
      details: "Added medical record with ZK proof",
    },
    {
      id: "4",
      timestamp: "2024-01-20 14:15:33",
      user: "0x4567...8901",
      action: "VERIFY_PROOF",
      resource: "Verifier",
      status: "failed",
      details: "ZK proof verification failed for record ID 123",
    },
    {
      id: "5",
      timestamp: "2024-01-20 14:10:18",
      user: "0x5678...9012",
      action: "ASSIGN_ROLE",
      resource: "RoleManager",
      status: "warning",
      details: "Role assignment attempted without proper permissions",
    },
  ]

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/20 text-green-300 border-green-500/30"
      case "failed":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      case "warning":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Audit Logs</CardTitle>
            <CardDescription className="text-white/70">System activity and security logs</CardDescription>
          </div>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-white/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-white/70">Timestamp</TableHead>
                <TableHead className="text-white/70">User</TableHead>
                <TableHead className="text-white/70">Action</TableHead>
                <TableHead className="text-white/70">Resource</TableHead>
                <TableHead className="text-white/70">Status</TableHead>
                <TableHead className="text-white/70">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-white/20 hover:bg-white/5">
                  <TableCell className="text-white/70 font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell className="text-white font-mono">{log.user}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-white/70">{log.resource}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                  </TableCell>
                  <TableCell className="text-white/70 max-w-xs truncate">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/70">No audit logs found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
