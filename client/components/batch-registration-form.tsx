"use client"

import type React from "react"

import { useState } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn, generateBatchId } from "@/lib/utils"
import { DRUG_REGISTRY_ADDRESS, DRUG_REGISTRY_ABI } from "@/lib/contracts/DrugRegistry"
import { useToast } from "@/hooks/use-toast"

interface BatchForm {
  drugName: string
  manufacturingDate: Date | undefined
  expiryDate: Date | undefined
}

export function BatchRegistrationForm() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [form, setForm] = useState<BatchForm>({
    drugName: "",
    manufacturingDate: undefined,
    expiryDate: undefined,
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.drugName || !form.manufacturingDate || !form.expiryDate || !address) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (form.expiryDate <= form.manufacturingDate) {
      toast({
        title: "Error",
        description: "Expiry date must be after manufacturing date",
        variant: "destructive",
      })
      return
    }

    try {
      // Generate batch ID
      const timestamp = Math.floor(Date.now() / 1000)
      const batchId = generateBatchId(form.drugName, address, timestamp)

      // Convert dates to Unix timestamps
      const mfgTimestamp = BigInt(Math.floor(form.manufacturingDate.getTime() / 1000))
      const expTimestamp = BigInt(Math.floor(form.expiryDate.getTime() / 1000))

      writeContract({
        address: DRUG_REGISTRY_ADDRESS,
        abi: DRUG_REGISTRY_ABI,
        functionName: "registerBatch",
        args: [batchId, form.drugName, mfgTimestamp, expTimestamp],
      })

      toast({
        title: "Transaction Submitted",
        description: "Batch registration transaction has been submitted",
      })
    } catch (error) {
      console.error("Registration failed:", error)
      toast({
        title: "Error",
        description: "Failed to register batch",
        variant: "destructive",
      })
    }
  }

  // Reset form after successful transaction
  if (hash && !isPending && !isConfirming) {
    setForm({
      drugName: "",
      manufacturingDate: undefined,
      expiryDate: undefined,
    })
    toast({
      title: "Success",
      description: "Batch registered successfully!",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="drugName">Drug Name</Label>
        <Input
          id="drugName"
          placeholder="e.g., Aspirin 500mg"
          value={form.drugName}
          onChange={(e) => setForm({ ...form, drugName: e.target.value })}
          className="bg-slate-800 border-slate-600 text-white"
        />
      </div>

      <div className="space-y-2">
        <Label>Manufacturing Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-slate-800 border-slate-600 text-white",
                !form.manufacturingDate && "text-slate-400",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.manufacturingDate ? format(form.manufacturingDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glassmorphism border-slate-700">
            <Calendar
              mode="single"
              selected={form.manufacturingDate}
              onSelect={(date) => setForm({ ...form, manufacturingDate: date })}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Expiry Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal bg-slate-800 border-slate-600 text-white",
                !form.expiryDate && "text-slate-400",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.expiryDate ? format(form.expiryDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 glassmorphism border-slate-700">
            <Calendar
              mode="single"
              selected={form.expiryDate}
              onSelect={(date) => setForm({ ...form, expiryDate: date })}
              disabled={(date) => date < new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isPending ? "Confirming..." : "Registering..."}
          </>
        ) : (
          "Register Batch"
        )}
      </Button>
    </form>
  )
}
