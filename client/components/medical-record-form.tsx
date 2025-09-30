"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useZKProof } from "@/hooks/use-zkproof"
import { Shield, Loader2 } from "lucide-react"

export function MedicalRecordForm() {
  const [formData, setFormData] = useState({
    patientId: "",
    diagnosis: "",
    treatment: "",
    severity: 1,
  })

  const { submitRecord, isGenerating, isPending } = useZKProof()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const recordData = {
      ...formData,
      timestamp: Math.floor(Date.now() / 1000),
    }

    await submitRecord(recordData)

    // Reset form
    setFormData({
      patientId: "",
      diagnosis: "",
      treatment: "",
      severity: 1,
    })
  }

  const isLoading = isGenerating || isPending

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Add Medical Record with ZK Proof
        </CardTitle>
        <CardDescription className="text-white/70">
          Create a privacy-preserving medical record using zero-knowledge proofs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId" className="text-white">
                Patient ID
              </Label>
              <Input
                id="patientId"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="Enter patient ID"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity" className="text-white">
                Severity Level
              </Label>
              <Select
                value={formData.severity.toString()}
                onValueChange={(value) => setFormData({ ...formData, severity: Number.parseInt(value) })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level} {level <= 3 ? "(Mild)" : level <= 7 ? "(Moderate)" : "(Severe)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="text-white">
              Diagnosis
            </Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Enter diagnosis (encrypted in ZK proof)"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment" className="text-white">
              Treatment Plan
            </Label>
            <Textarea
              id="treatment"
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="Enter treatment plan (encrypted in ZK proof)"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              rows={3}
              required
            />
          </div>

          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-blue-300 font-medium mb-2">Privacy Protection</h4>
            <p className="text-blue-200/70 text-sm">
              Only the severity level and timestamp will be publicly visible. Diagnosis and treatment details are
              encrypted using zero-knowledge proofs.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isGenerating ? "Generating ZK Proof..." : "Submitting Record..."}
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Create Record with ZK Proof
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
