"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Truck, Activity, Shield } from "lucide-react"
import type { UserRole } from "@/types/contracts"

interface RoleSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const roles = [
  {
    id: "manufacturer" as UserRole,
    title: "Manufacturer",
    description: "Register drug batches, manage inventory, and track production",
    icon: Building2,
    gradient: "from-purple-500 to-purple-600",
    path: "/dashboard/manufacturer",
  },
  {
    id: "distributor" as UserRole,
    title: "Distributor",
    description: "Transfer batches, track supply chain, and manage logistics",
    icon: Truck,
    gradient: "from-cyan-500 to-cyan-600",
    path: "/dashboard/distributor",
  },
  {
    id: "provider" as UserRole,
    title: "Healthcare Provider",
    description: "Commit medical records with zero-knowledge proofs",
    icon: Activity,
    gradient: "from-pink-500 to-pink-600",
    path: "/dashboard/provider",
  },
  {
    id: "admin" as UserRole,
    title: "Admin",
    description: "Manage roles, view system stats, and monitor activity",
    icon: Shield,
    gradient: "from-indigo-500 to-indigo-600",
    path: "/dashboard/admin",
  },
]

export function RoleSelectorModal({ open, onOpenChange }: RoleSelectorModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null)
  const router = useRouter()

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleContinue = () => {
    const role = roles.find((r) => r.id === selectedRole)
    if (role) {
      router.push(role.path)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glassmorphism border-slate-700 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Your Role</DialogTitle>
          <DialogDescription>
            Choose the role that best describes your function in the healthcare system
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedRole === role.id
                  ? "border-purple-500 bg-purple-500/10"
                  : "glassmorphism border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-r ${role.gradient} flex items-center justify-center mb-4`}
                >
                  <role.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{role.title}</h3>
                <p className="text-slate-300 text-sm">{role.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
          >
            Continue to Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
