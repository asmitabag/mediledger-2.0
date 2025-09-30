"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";
import {
  MEDICAL_RECORD_ADDRESS,
  MEDICAL_RECORD_ABI,
} from "@/lib/contracts/MedicalRecord";
import { keccak256, toBytes } from "viem";

const ROLES = {
  MANUFACTURER: {
    hash: keccak256(toBytes("MANUFACTURER_ROLE")),
    name: "Manufacturer",
    description: "Create and register drug batches on the blockchain",
    contract: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    addFunction: "addManufacturer",
    removeFunction: "removeManufacturer",
    color: "purple",
  },
  DISTRIBUTOR: {
    hash: keccak256(toBytes("DISTRIBUTOR_ROLE")),
    name: "Distributor",
    description: "Transfer drug batches through supply chain",
    contract: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    addFunction: "addDistributor",
    removeFunction: "removeDistributor",
    color: "cyan",
  },
  HEALTHCARE_PROVIDER: {
    hash: keccak256(toBytes("HEALTHCARE_PROVIDER_ROLE")),
    name: "Healthcare Provider",
    description: "Commit medical records with zero-knowledge proofs",
    contract: MEDICAL_RECORD_ADDRESS,
    abi: MEDICAL_RECORD_ABI,
    addFunction: "addHealthcareProvider",
    removeFunction: "removeHealthcareProvider",
    color: "green",
  },
  ML_LOGGER: {
    hash: keccak256(toBytes("ML_LOGGER_ROLE")),
    name: "ML Logger",
    description: "Log anomaly detection results from ML models",
    contract: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    addFunction: "addMLLogger",
    removeFunction: "removeMLLogger",
    color: "blue",
  },
};

interface RoleAction {
  type: "add" | "remove";
  role: keyof typeof ROLES;
  address: string;
}

export function RoleManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES | "">("");
  const [targetAddress, setTargetAddress] = useState("");
  const [pendingAction, setPendingAction] = useState<RoleAction | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      setTargetAddress("");
      setSelectedRole("");
      setIsDialogOpen(false);
      setPendingAction(null);
      reset();
    }
  }, [isSuccess, reset]);

  const handleGrantRole = () => {
    if (!targetAddress || !selectedRole) return;

    const role = ROLES[selectedRole];
    setPendingAction({
      type: "add",
      role: selectedRole,
      address: targetAddress,
    });

    writeContract({
      address: role.contract,
      abi: role.abi,
      functionName: role.addFunction,
      args: [targetAddress as `0x${string}`],
    });
  };

  const handleRevokeRole = (roleKey: keyof typeof ROLES, address: string) => {
    const role = ROLES[roleKey];
    setPendingAction({ type: "remove", role: roleKey, address });

    writeContract({
      address: role.contract,
      abi: role.abi,
      functionName: role.removeFunction,
      args: [address as `0x${string}`],
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Role Management</CardTitle>
              <CardDescription className="text-white/70">
                Manage blockchain roles and permissions
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Grant Role
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Grant Role</DialogTitle>
                  <DialogDescription className="text-white/70">
                    Assign a blockchain role to a wallet address
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress" className="text-white">
                      Wallet Address
                    </Label>
                    <Input
                      id="walletAddress"
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="0x..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Select Role</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map(
                        (key) => {
                          const role = ROLES[key];
                          return (
                            <Button
                              key={key}
                              type="button"
                              variant={
                                selectedRole === key ? "default" : "outline"
                              }
                              className={
                                selectedRole === key
                                  ? `bg-${role.color}-600 hover:bg-${role.color}-700`
                                  : "bg-white/5 border-white/20 text-white hover:bg-white/10"
                              }
                              onClick={() => setSelectedRole(key)}
                            >
                              {role.name}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    {selectedRole && (
                      <p className="text-xs text-white/60 mt-2">
                        {ROLES[selectedRole].description}
                      </p>
                    )}
                  </div>

                  {isSuccess && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-200">
                        Role granted successfully! Transaction:{" "}
                        {hash?.slice(0, 10)}...
                      </AlertDescription>
                    </Alert>
                  )}

                  {(isPending || isConfirming) && (
                    <Alert className="border-blue-500/50 bg-blue-500/10">
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      <AlertDescription className="text-blue-200">
                        {isPending
                          ? "Waiting for wallet confirmation..."
                          : "Transaction confirming..."}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleGrantRole}
                    disabled={
                      isPending ||
                      isConfirming ||
                      !targetAddress ||
                      !selectedRole
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Grant Role
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/70">Role Name</TableHead>
                  <TableHead className="text-white/70">Description</TableHead>
                  <TableHead className="text-white/70">Contract</TableHead>
                  <TableHead className="text-white/70">Role Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map(
                  (key) => {
                    const role = ROLES[key];
                    return (
                      <TableRow
                        key={key}
                        className="border-white/20 hover:bg-white/5"
                      >
                        <TableCell className="text-white font-medium">
                          <Badge
                            className={`bg-${role.color}-500/20 text-${role.color}-300 border-${role.color}-500/30`}
                          >
                            {role.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/70 text-sm">
                          {role.description}
                        </TableCell>
                        <TableCell className="text-white/50 font-mono text-xs">
                          {role.contract.slice(0, 6)}...
                          {role.contract.slice(-4)}
                        </TableCell>
                        <TableCell className="text-white/50 font-mono text-xs">
                          {role.hash.slice(0, 10)}...
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-white text-sm font-semibold">
                  How Role Management Works
                </p>
                <ul className="text-white/70 text-xs space-y-1 list-disc list-inside">
                  <li>Roles are managed on-chain through smart contracts</li>
                  <li>Only admins can grant or revoke roles</li>
                  <li>Each role has specific permissions and capabilities</li>
                  <li>Role changes are recorded on the blockchain</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
