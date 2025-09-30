"use client"

import { useState } from "react"
import { useAccount, useReadContract } from "wagmi"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Send, Ban, Eye } from "lucide-react"
import { formatAddress, formatTimestamp, getEtherscanUrl, copyToClipboard } from "@/lib/utils"
import { DRUG_REGISTRY_ADDRESS, DRUG_REGISTRY_ABI } from "@/lib/contracts/DrugRegistry"
import { useToast } from "@/hooks/use-toast"
import { TransferModal } from "@/components/transfer-modal"
import type { DrugBatch } from "@/types/contracts"

export function ManufacturerBatchesTable() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [selectedBatch, setSelectedBatch] = useState<DrugBatch | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Get all batch IDs (in a real app, you'd filter by manufacturer)
  const { data: allBatchIds } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
    query: {
      enabled: !!address,
    },
  })

  // Sample data for demonstration
  const sampleBatches: DrugBatch[] = [
    {
      batchId: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
      manufacturer: address!,
      drugName: "Aspirin 500mg",
      manufacturingDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 30),
      expiryDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 365),
      isActive: true,
      currentOwner: address!,
    },
    {
      batchId: "0xabcdef1234567890abcdef1234567890abcdef12" as `0x${string}`,
      manufacturer: address!,
      drugName: "Ibuprofen 200mg",
      manufacturingDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 15),
      expiryDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 730),
      isActive: true,
      currentOwner: "0x742d35Cc6634C0532925a3b8D4C2C4e4C4C4C4C4" as `0x${string}`,
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

  const isOwner = (batch: DrugBatch) => batch.currentOwner.toLowerCase() === address?.toLowerCase()

  return (
    <>
      <div className="rounded-md border border-slate-700">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead>Batch ID</TableHead>
              <TableHead>Drug Name</TableHead>
              <TableHead>Manufacturing Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Owner</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleBatches.map((batch) => {
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
                  <TableCell>{formatTimestamp(batch.manufacturingDate)}</TableCell>
                  <TableCell>{formatTimestamp(batch.expiryDate)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      <span>{formatAddress(batch.currentOwner)}</span>
                      {isOwner(batch) && <Badge variant="outline">You</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {isOwner(batch) && batch.isActive && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleTransfer(batch)}>
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <a href={getEtherscanUrl(batch.batchId)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
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
