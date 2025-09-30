"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";
import { keccak256, toBytes } from "viem";

export default function ManufacturerDashboard() {
  const { address, isConnected } = useAccount();
  const [drugName, setDrugName] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [batchId, setBatchId] = useState("");

  // Check if user has manufacturer role
  const MANUFACTURER_ROLE = keccak256(toBytes("MANUFACTURER_ROLE"));

  const { data: hasRole, isLoading: roleLoading } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "hasRole",
    args: address ? [MANUFACTURER_ROLE, address] : undefined,
  });

  const { data: allBatchIds, refetch: refetchBatches } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
  });

  // Write contract hook
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetchBatches();
      setDrugName("");
      setMfgDate("");
      setExpDate("");
    }
  }, [isSuccess, refetchBatches]);

  const handleRegisterBatch = () => {
    if (!drugName || !mfgDate || !expDate) return;

    const generatedBatchId = keccak256(
      toBytes(`${drugName}-${Date.now()}-${address}`)
    );
    setBatchId(generatedBatchId);

    const mfgTimestamp = Math.floor(new Date(mfgDate).getTime() / 1000);
    const expTimestamp = Math.floor(new Date(expDate).getTime() / 1000);

    writeContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "registerBatch",
      args: [
        generatedBatchId,
        drugName,
        BigInt(mfgTimestamp),
        BigInt(expTimestamp),
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen py-8 px-4 bg-slate-950 flex items-center justify-center">
        <Alert className="max-w-md border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-200">
            Please connect your wallet to access the manufacturer dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen py-8 px-4 bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="min-h-screen py-8 px-4 bg-slate-950 flex items-center justify-center">
        <Alert className="max-w-md border-red-500/50 bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-200">
            Access Denied. You need Manufacturer role to access this dashboard.
            Please contact an admin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Manufacturer Dashboard
              </h1>
              <p className="text-slate-400">
                Manage drug batches and track production
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {allBatchIds?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Manufacturer Address</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 font-mono break-all">
                {address}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="text-white">Active</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Register New Batch</CardTitle>
                <CardDescription className="text-slate-400">
                  Create a new pharmaceutical batch on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drugName" className="text-white">
                    Drug Name
                  </Label>
                  <Input
                    id="drugName"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder="e.g., Aspirin"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mfgDate" className="text-white">
                    Manufacturing Date
                  </Label>
                  <Input
                    id="mfgDate"
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expDate" className="text-white">
                    Expiry Date
                  </Label>
                  <Input
                    id="expDate"
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {isSuccess && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-200">
                      Batch registered successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleRegisterBatch}
                  disabled={
                    isPending ||
                    isConfirming ||
                    !drugName ||
                    !mfgDate ||
                    !expDate
                  }
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPending ? "Confirming..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Register Batch
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  All Registered Batches
                </CardTitle>
                <CardDescription className="text-slate-400">
                  View all drug batches registered on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allBatchIds && allBatchIds.length > 0 ? (
                    allBatchIds.map((id, idx) => (
                      <BatchCard key={idx} batchId={id} />
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">
                      No batches registered yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchCard({ batchId }: { batchId: string }) {
  const { data: batchInfo } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: [batchId as `0x${string}`],
  });

  if (!batchInfo) return null;

  // The contract returns a DrugBatch struct with these properties:
  // batchId, manufacturer, drugName, manufacturingDate, expiryDate, isActive, currentOwner
  const batch = batchInfo as any;

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold">{batch.drugName}</h3>
          <p className="text-xs text-slate-400 font-mono">{batchId}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs ${
            batch.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {batch.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-500">Manufactured</p>
          <p className="text-slate-300">
            {new Date(
              Number(batch.manufacturingDate) * 1000
            ).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Expires</p>
          <p className="text-slate-300">
            {new Date(Number(batch.expiryDate) * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-slate-500 text-xs">Current Owner</p>
        <p className="text-slate-300 text-xs font-mono">{batch.currentOwner}</p>
      </div>
    </div>
  );
}
