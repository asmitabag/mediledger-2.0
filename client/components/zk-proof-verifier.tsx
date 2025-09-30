"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useZKProof } from "@/hooks/use-zkproof"
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react"

export function ZKProofVerifier() {
  const [recordId, setRecordId] = useState("")
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null)
  const { verifyProof, isVerifying } = useZKProof()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recordId.trim()) return

    try {
      const result = await verifyProof(recordId)
      setVerificationResult(result)
    } catch (error) {
      setVerificationResult(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            ZK Proof Verifier
          </CardTitle>
          <CardDescription className="text-white/70">
            Verify the authenticity of medical records using zero-knowledge proofs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recordId" className="text-white">
                Record ID
              </Label>
              <Input
                id="recordId"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                placeholder="Enter record ID to verify"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isVerifying || !recordId.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying Proof...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify ZK Proof
                </>
              )}
            </Button>
          </form>

          {verificationResult !== null && (
            <div
              className={`mt-6 p-4 rounded-lg border ${
                verificationResult ? "bg-green-500/20 border-green-500/30" : "bg-red-500/20 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {verificationResult ? (
                  <CheckCircle className="w-5 h-5 text-green-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-300" />
                )}
                <h4 className={`font-medium ${verificationResult ? "text-green-300" : "text-red-300"}`}>
                  {verificationResult ? "Verification Successful" : "Verification Failed"}
                </h4>
              </div>
              <p className={`text-sm mt-1 ${verificationResult ? "text-green-200/70" : "text-red-200/70"}`}>
                {verificationResult
                  ? "The ZK proof is valid and the record is authentic."
                  : "The ZK proof is invalid or the record has been tampered with."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">How ZK Proofs Work</CardTitle>
          <CardDescription className="text-white/70">Understanding zero-knowledge proof verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-300 text-sm font-bold">1</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Privacy Preservation</h4>
                <p className="text-white/70 text-sm">
                  Sensitive medical data is encrypted and only severity/timestamp are public
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-300 text-sm font-bold">2</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Cryptographic Proof</h4>
                <p className="text-white/70 text-sm">
                  Groth16 zk-SNARKs prove record validity without revealing content
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-300 text-sm font-bold">3</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Blockchain Verification</h4>
                <p className="text-white/70 text-sm">
                  Smart contracts verify proofs on-chain ensuring immutable records
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mt-6">
            <h4 className="text-blue-300 font-medium mb-2">Security Benefits</h4>
            <ul className="text-blue-200/70 text-sm space-y-1">
              <li>• Patient privacy is mathematically guaranteed</li>
              <li>• Records cannot be forged or tampered with</li>
              <li>• Verification is instant and trustless</li>
              <li>• Compliance with healthcare regulations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
