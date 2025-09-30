"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Search, Camera, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatAddress } from "@/lib/utils"

export function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const [scannedData, setScannedData] = useState<string | null>(null)
  const { toast } = useToast()

  const handleStartScan = () => {
    // In a real implementation, this would use react-qr-reader
    // For demo purposes, we'll simulate a scan
    setIsScanning(true)

    // Simulate scanning delay
    setTimeout(() => {
      const mockBatchId = "0x1234567890abcdef1234567890abcdef12345678"
      setScannedData(mockBatchId)
      setIsScanning(false)
      toast({
        title: "QR Code Scanned",
        description: `Batch ID: ${formatAddress(mockBatchId)}`,
      })
    }, 2000)
  }

  const handleStopScan = () => {
    setIsScanning(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      setScannedData(manualInput.trim())
      toast({
        title: "Batch ID Entered",
        description: `Batch ID: ${formatAddress(manualInput.trim())}`,
      })
    }
  }

  const handleVerifyBatch = () => {
    if (scannedData) {
      // Navigate to verification page
      window.open(`/verify?batch=${scannedData}`, "_blank")
    }
  }

  return (
    <div className="space-y-4">
      {/* QR Scanner */}
      <div className="text-center">
        {!isScanning ? (
          <div className="space-y-4">
            <div className="w-32 h-32 mx-auto rounded-lg bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-slate-400" />
            </div>
            <Button
              onClick={handleStartScan}
              className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800"
            >
              <Camera className="w-4 h-4 mr-2" />
              Start QR Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-32 h-32 mx-auto rounded-lg bg-gradient-to-r from-cyan-600/20 to-cyan-700/20 border-2 border-cyan-500 flex items-center justify-center animate-pulse">
              <Camera className="w-16 h-16 text-cyan-400" />
            </div>
            <div className="text-cyan-400 text-sm">Scanning for QR code...</div>
            <Button variant="outline" onClick={handleStopScan}>
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="border-t border-slate-700 pt-4">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <Label htmlFor="batchId">Or enter Batch ID manually</Label>
          <div className="flex gap-2">
            <Input
              id="batchId"
              placeholder="0x..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white font-mono"
            />
            <Button type="submit" variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Scanned Result */}
      {scannedData && (
        <Card className="glassmorphism border-slate-700">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Scanned Batch ID</span>
                <Button variant="ghost" size="sm" onClick={() => setScannedData(null)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="font-mono text-sm bg-slate-800 p-2 rounded border">{scannedData}</div>
              <Button
                onClick={handleVerifyBatch}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
              >
                Verify Batch
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
