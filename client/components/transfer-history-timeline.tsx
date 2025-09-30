"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, MapPin, Clock } from "lucide-react"
import { formatAddress, formatRelativeTime } from "@/lib/utils"
import type { Transfer } from "@/types/contracts"

export function TransferHistoryTimeline() {
  // Sample transfer history data
  const transfers: (Transfer & { batchId: string; drugName: string })[] = [
    {
      batchId: "0xabcdef1234567890abcdef1234567890abcdef12",
      drugName: "Ibuprofen 200mg",
      from: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      to: "0x9876543210987654321098765432109876543210" as `0x${string}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600),
      location: "Distribution Center, Chicago",
    },
    {
      batchId: "0x9876543210987654321098765432109876543210",
      drugName: "Paracetamol 500mg",
      from: "0x1111111111111111111111111111111111111111" as `0x${string}`,
      to: "0x2222222222222222222222222222222222222222" as `0x${string}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000) - 7200),
      location: "Warehouse B, New York",
    },
    {
      batchId: "0x5555555555555555555555555555555555555555",
      drugName: "Aspirin 500mg",
      from: "0x3333333333333333333333333333333333333333" as `0x${string}`,
      to: "0x4444444444444444444444444444444444444444" as `0x${string}`,
      timestamp: BigInt(Math.floor(Date.now() / 1000) - 86400),
      location: "Regional Hub, Los Angeles",
    },
  ]

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No transfer history</p>
        <p className="text-sm">Recent transfers will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transfers.map((transfer, index) => (
        <Card key={`${transfer.batchId}-${transfer.timestamp}`} className="glassmorphism border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600" />
                {index < transfers.length - 1 && <div className="w-px h-16 bg-slate-600 mt-2" />}
              </div>

              {/* Transfer details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {transfer.drugName}
                    </Badge>
                    <span className="text-slate-400 text-sm">{formatRelativeTime(transfer.timestamp)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="font-mono text-purple-400">{formatAddress(transfer.from)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-cyan-400">{formatAddress(transfer.to)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{transfer.location}</span>
                </div>

                <div className="mt-2 text-xs text-slate-500 font-mono">Batch: {formatAddress(transfer.batchId)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
