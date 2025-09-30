"use client"

import { useChainId, useSwitchChain } from "wagmi"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { sepolia } from "wagmi/chains"

export function NetworkWarning() {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  if (chainId === sepolia.id) return null

  return (
    <Alert className="border-orange-500/50 bg-orange-500/10 mb-6">
      <AlertTriangle className="h-4 w-4 text-orange-500" />
      <AlertDescription className="text-orange-200">
        <div className="flex items-center justify-between">
          <span>Wrong network detected. Please switch to Sepolia testnet to use this feature.</span>
          <Button
            size="sm"
            onClick={() => switchChain({ chainId: sepolia.id })}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Switch to Sepolia
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
