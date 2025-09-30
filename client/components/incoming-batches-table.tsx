"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Send, Eye } from "lucide-react"
import { formatAddress, formatTimestamp, copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { TransferModal } from "@/components/transfer-modal"
import type { DrugBatch } from "@/types/contracts"
import { Package } from "lucide-react" // Declaring the Package variable

export function IncomingBatchesTable() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [selectedBatch, setSelectedBatch] = useState<DrugBatch | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Sample data for demonstration - batches owned by this distributor
  const incomingBatches: DrugBatch[] = [
    {
      batchId: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
      manufacturer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      drugName: "Ibuprofen 200mg",
      manufacturingDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 15),
      expiryDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 730),
      isActive: true,
      currentOwner: address!,
    },
    {
      batchId: "0x9876543210987654321098765432109876543210" as `0x${string}`,
      manufacturer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
      drugName: "Paracetamol 500mg",
      manufacturingDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 7),
      expiryDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 1095),
      isActive: true,
      currentOwner: address!,
    },
  ]

  const handleCopy = (text: string) => {
    copyToClipboard(text)
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    })
  }

  const handleTransfer = (batch: DrugBatch) => {
    setSelectedBatch(batch)
    setShowTransferModal(true)
  }

  const getBatchStatus = (batch: DrugBatch) => {
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (!batch.isActive) return { label: "Inactive", variant: "destructive" as const }
    if (batch.expiryDate < now) return { label: "Expired", variant: "secondary" as const }
    return { label: "Active", variant: "default" as const }
  }

  if (incomingBatches.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No batches in possession</p>
        <p className="text-sm">Batches transferred to you will appear here</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead>Batch ID</TableHead>
              <TableHead>Drug Name</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomingBatches.map((batch) => {
              const status = getBatchStatus(batch)
              return (
                <TableRow key={batch.batchId} className="border-slate-700">
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      <span>{formatAddress(batch.batchId)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(batch.batchId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{batch.drugName}</TableCell>
                  <TableCell className="font-mono">{formatAddress(batch.manufacturer)}</TableCell>
                  <TableCell>{formatTimestamp(batch.expiryDate)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {batch.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleTransfer(batch)}>
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedBatch && (
        <TransferModal
          open={showTransferModal}
          onOpenChange={setShowTransferModal}
          batch={selectedBatch}
          onTransferComplete={() => {
            setShowTransferModal(false)
            setSelectedBatch(null)
          }}
        />
      )}
    </>
  )
}
