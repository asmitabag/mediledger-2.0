"use client"

import { useAccount, useChainId, useSwitchChain } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, ExternalLink, AlertTriangle, CheckCircle2, Wallet } from "lucide-react"
import { formatAddress, getAddressUrl, copyToClipboard } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { RoleSelectorModal } from "@/components/role-selector-modal"
import { useState } from "react"
import { sepolia } from "wagmi/chains"

export default function ConnectPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { toast } = useToast()
  const [showRoleModal, setShowRoleModal] = useState(false)

  const isCorrectNetwork = chainId === sepolia.id

  const handleCopy = () => {
    if (address) {
      copyToClipboard(address)
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Connect Your Wallet
            </span>
          </h1>
          <p className="text-slate-300 text-lg">Connect your wallet to access MediLedger 2.0 features</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glassmorphism border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                Wallet Connection
              </CardTitle>
              <CardDescription>Connect your Ethereum wallet to interact with smart contracts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isConnected ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600/20 to-cyan-600/20 flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-slate-300 text-center mb-4">
                    Connect your wallet to get started with MediLedger 2.0
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Network Status */}
                  {!isCorrectNetwork ? (
                    <Alert className="border-orange-500/50 bg-orange-500/10">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <AlertDescription className="text-orange-200">
                        <div className="flex items-center justify-between">
                          <span>Wrong network detected. Please switch to Sepolia testnet.</span>
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
                  ) : (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-200">
                        Connected to Sepolia testnet - Ready to interact with smart contracts
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Wallet Info */}
                  <div className="glassmorphism border-slate-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Wallet Address</span>
                      <div className="flex items-center gap-2">
                        <code className="text-purple-400 font-mono">{formatAddress(address!)}</code>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <a href={getAddressUrl(address!)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Network</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${isCorrectNetwork ? "bg-green-500" : "bg-orange-500"}`}
                        />
                        <span className="text-white font-medium">
                          {isCorrectNetwork ? "Sepolia Testnet" : "Wrong Network"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Chain ID</span>
                      <span className="text-white font-mono">{chainId}</span>
                    </div>
                  </div>

                  {/* Role Selection */}
                  {isCorrectNetwork && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-semibold">Select Your Role</h3>
                          <p className="text-slate-400 text-sm">Choose your role to access the appropriate dashboard</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowRoleModal(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                      >
                        Select Role
                      </Button>
                      <p className="text-slate-400 text-xs text-center">
                        Note: Admin must grant you the selected role before you can access dashboard features
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="glassmorphism border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-2">Secure Connection</h4>
              <p className="text-slate-400 text-sm">Your wallet stays in your control. We never access your keys.</p>
            </CardContent>
          </Card>
          <Card className="glassmorphism border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-2">Sepolia Testnet</h4>
              <p className="text-slate-400 text-sm">All transactions use test ETH. No real funds required.</p>
            </CardContent>
          </Card>
          <Card className="glassmorphism border-slate-700">
            <CardContent className="p-4">
              <h4 className="text-white font-semibold mb-2">Role-Based Access</h4>
              <p className="text-slate-400 text-sm">Different roles unlock different features and permissions.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <RoleSelectorModal open={showRoleModal} onOpenChange={setShowRoleModal} />
    </div>
  )
}
