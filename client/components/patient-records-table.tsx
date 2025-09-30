"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Shield, Eye, Calendar } from "lucide-react"

interface PatientRecord {
  id: string
  patientId: string
  severity: number
  timestamp: number
  zkProofHash: string
  verified: boolean
}

export function PatientRecordsTable() {
  const [searchTerm, setSearchTerm] = useState("")

  // Mock data - in real app, this would come from blockchain
  const records: PatientRecord[] = [
    {
      id: "1",
      patientId: "PAT-001",
      severity: 3,
      timestamp: Date.now() - 86400000,
      zkProofHash: "0x1234...5678",
      verified: true,
    },
    {
      id: "2",
      patientId: "PAT-002",
      severity: 7,
      timestamp: Date.now() - 172800000,
      zkProofHash: "0x2345...6789",
      verified: true,
    },
    {
      id: "3",
      patientId: "PAT-003",
      severity: 5,
      timestamp: Date.now() - 259200000,
      zkProofHash: "0x3456...7890",
      verified: false,
    },
  ]

  const filteredRecords = records.filter((record) => record.patientId.toLowerCase().includes(searchTerm.toLowerCase()))

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return "bg-green-500/20 text-green-300 border-green-500/30"
    if (severity <= 7) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    return "bg-red-500/20 text-red-300 border-red-500/30"
  }

  const getSeverityLabel = (severity: number) => {
    if (severity <= 3) return "Mild"
    if (severity <= 7) return "Moderate"
    return "Severe"
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white">Patient Records</CardTitle>
        <CardDescription className="text-white/70">
          View and manage patient medical records with ZK proof verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              placeholder="Search by patient ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/20 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-white/70">Patient ID</TableHead>
                <TableHead className="text-white/70">Severity</TableHead>
                <TableHead className="text-white/70">Date</TableHead>
                <TableHead className="text-white/70">ZK Proof</TableHead>
                <TableHead className="text-white/70">Status</TableHead>
                <TableHead className="text-white/70">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id} className="border-white/20 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{record.patientId}</TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(record.severity)}>
                      {getSeverityLabel(record.severity)} ({record.severity})
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(record.timestamp).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70 font-mono text-sm">{record.zkProofHash}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        record.verified
                          ? "bg-green-500/20 text-green-300 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                      }
                    >
                      {record.verified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/70">No records found matching your search.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
