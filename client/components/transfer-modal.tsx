"use client"

import type React from "react"

import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { DRUG_REGISTRY_ADDRESS, DRUG_REGISTRY_ABI } from "@/lib/contracts/DrugRegistry"
import { useToast } from "@/hooks/use-toast"
import { formatAddress } from "@/lib/utils"
import type { DrugBatch } from "@/types/contracts"

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: DrugBatch
  onTransferComplete: () => void
}

export function TransferModal({ open, onOpenChange, batch, onTransferComplete }: TransferModalProps) {
  const { toast } = useToast()
  const [recipientAddress, setRecipientAddress] = useState("")
  const [location, setLocation] = useState("")

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!recipientAddress || !location) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    // Basic address validation
    if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
      toast({
        title: "Error",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      })
      return
    }

    try {
      writeContract({
        address: DRUG_REGISTRY_ADDRESS,
        abi: DRUG_REGISTRY_ABI,
        functionName: "transferBatch",
        args: [batch.batchId, recipientAddress as `0x${string}`, location],
      })

      toast({
        title: "Transaction Submitted",
        description: "Batch transfer transaction has been submitted",
      })
    } catch (error) {
      console.error("Transfer failed:", error)
      toast({
        title: "Error",
        description: "Failed to transfer batch",
        variant: "destructive",
      })
    }
  }

  // Handle successful transaction
  if (hash && !isPending && !isConfirming) {
    toast({
      title: "Success",
      description: "Batch transferred successfully!",
    })
    onTransferComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glassmorphism border-slate-700">
        <DialogHeader>
          <DialogTitle>Transfer Batch</DialogTitle>
          <DialogDescription>
            Transfer batch {formatAddress(batch.batchId)} ({batch.drugName}) to another party
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Current Location</Label>
            <Input
              id="location"
              placeholder="e.g., Warehouse A, New York"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending || isConfirming}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isConfirming}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending ? "Confirming..." : "Transferring..."}
                </>
              ) : (
                "Transfer Batch"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
