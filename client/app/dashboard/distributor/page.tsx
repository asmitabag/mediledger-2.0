"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
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
  Truck,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  MapPin,
  XCircle,
} from "lucide-react";
import {
  DRUG_REGISTRY_ADDRESS,
  DRUG_REGISTRY_ABI,
} from "@/lib/contracts/DrugRegistry";
import { keccak256, toBytes } from "viem";

export default function DistributorDashboard() {
  const { address, isConnected } = useAccount();
  const [selectedBatch, setSelectedBatch] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [location, setLocation] = useState("");
  const [myBatches, setMyBatches] = useState<string[]>([]);

  const DISTRIBUTOR_ROLE = keccak256(toBytes("DISTRIBUTOR_ROLE"));

  const { data: hasRole, isLoading: roleLoading } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "hasRole",
    args: address ? [DISTRIBUTOR_ROLE, address] : undefined,
  });

  const { data: allBatchIds, refetch: refetchBatches } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getAllBatchIds",
  });

  // Prepare batch info contracts for batch reading
  const batchContracts = (allBatchIds || []).map((batchId) => ({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: [batchId as `0x${string}`],
  }));

  const { data: batchInfos, refetch: refetchBatchInfos } = useReadContracts({
    contracts: batchContracts,
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Filter batches owned by the current user
  useEffect(() => {
    if (!batchInfos || !address || !allBatchIds) {
      setMyBatches([]);
      return;
    }

    const ownedBatches: string[] = [];

    batchInfos.forEach((result, index) => {
      if (result.status === "success" && result.result) {
        const batch = result.result as any;
        if (batch.currentOwner.toLowerCase() === address.toLowerCase()) {
          ownedBatches.push(allBatchIds[index]);
        }
      }
    });

    setMyBatches(ownedBatches);
  }, [batchInfos, address, allBatchIds]);

  useEffect(() => {
    if (isSuccess) {
      refetchBatches();
      refetchBatchInfos();
      setSelectedBatch("");
      setRecipientAddress("");
      setLocation("");
    }
  }, [isSuccess, refetchBatches, refetchBatchInfos]);

  const handleTransferBatch = () => {
    if (!selectedBatch || !recipientAddress || !location) return;

    writeContract({
      address: DRUG_REGISTRY_ADDRESS,
      abi: DRUG_REGISTRY_ABI,
      functionName: "transferBatch",
      args: [
        selectedBatch as `0x${string}`,
        recipientAddress as `0x${string}`,
        location,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen py-8 px-4 bg-slate-950 flex items-center justify-center">
        <Alert className="max-w-md border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-200">
            Please connect your wallet to access the distributor dashboard.
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
            Access Denied. You need Distributor role to access this dashboard.
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-700 flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Distributor Dashboard
              </h1>
              <p className="text-slate-400">
                Manage supply chain logistics and transfers
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">My Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {myBatches?.length || 0}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Distributor Address</CardTitle>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Transfer Batch</CardTitle>
                <CardDescription className="text-slate-400">
                  Transfer a batch to another party in the supply chain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batchSelect" className="text-white">
                    Select Batch
                  </Label>
                  <select
                    id="batchSelect"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full p-2 rounded bg-slate-800 border-slate-700 text-white"
                  >
                    <option value="">Select a batch...</option>
                    {myBatches?.map((id) => (
                      <option key={id} value={id}>
                        {id}...
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-white">
                    Recipient Address
                  </Label>
                  <Input
                    id="recipient"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-white">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., New York Distribution Center"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                {isSuccess && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-200">
                      Batch transferred successfully!
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleTransferBatch}
                  disabled={
                    isPending ||
                    isConfirming ||
                    !selectedBatch ||
                    !recipientAddress ||
                    !location
                  }
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isPending ? "Confirming..." : "Processing..."}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Transfer Batch
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">My Batches</CardTitle>
                <CardDescription className="text-slate-400">
                  Batches you currently own
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {myBatches && myBatches.length > 0 ? (
                    myBatches.map((id, idx) => (
                      <DistributorBatchCard
                        key={idx}
                        batchId={id}
                        currentAddress={address}
                      />
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-8">
                      No batches owned by you
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Transfer History</CardTitle>
              <CardDescription className="text-slate-400">
                Recent batch transfers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBatch && <TransferHistory batchId={selectedBatch} />}
              {!selectedBatch && (
                <p className="text-slate-400 text-center py-8">
                  Select a batch to view transfer history
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DistributorBatchCard({
  batchId,
  currentAddress,
}: {
  batchId: string;
  currentAddress: `0x${string}` | undefined;
}) {
  const { data: batchInfo } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getBatchInfo",
    args: [batchId as `0x${string}`],
  });

  if (!batchInfo) return null;

  const batch = batchInfo as any;

  // Only show if current user is the owner
  if (batch.currentOwner.toLowerCase() !== currentAddress?.toLowerCase()) {
    return null;
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-white font-semibold">{batch.drugName}</h3>
          <p className="text-xs text-slate-400 font-mono">
            {batchId.slice(0, 20)}...
          </p>
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
    </div>
  );
}

function TransferHistory({ batchId }: { batchId: string }) {
  const { data: transfers } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: DRUG_REGISTRY_ABI,
    functionName: "getTransferHistory",
    args: [batchId as `0x${string}`],
  });

  if (!transfers || transfers.length === 0) {
    return (
      <p className="text-slate-400 text-center py-8">No transfer history</p>
    );
  }

  return (
    <div className="space-y-4">
      {transfers.map((transfer: any, idx) => {
        return (
          <div
            key={idx}
            className="flex items-start gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700"
          >
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium">
                  {transfer.location}
                </span>
                <span className="text-slate-500 text-sm">
                  {new Date(Number(transfer.timestamp) * 1000).toLocaleString()}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <p className="text-slate-400">
                  From:{" "}
                  <span className="text-slate-300 font-mono">
                    {transfer.from.slice(0, 10)}...{transfer.from.slice(-8)}
                  </span>
                </p>
                <p className="text-slate-400">
                  To:{" "}
                  <span className="text-slate-300 font-mono">
                    {transfer.to.slice(0, 10)}...{transfer.to.slice(-8)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
