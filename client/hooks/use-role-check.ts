"use client"

import { useReadContract, useAccount } from "wagmi"
import { DRUG_REGISTRY_ADDRESS } from "@/lib/contracts/DrugRegistry"
import { MEDICAL_RECORD_ADDRESS } from "@/lib/contracts/MedicalRecord"
import { keccak256, toBytes } from "viem"

export function useRoleCheck() {
  const { address } = useAccount()

  // Role hashes
  const MANUFACTURER_ROLE = keccak256(toBytes("MANUFACTURER_ROLE"))
  const DISTRIBUTOR_ROLE = keccak256(toBytes("DISTRIBUTOR_ROLE"))
  const ML_LOGGER_ROLE = keccak256(toBytes("ML_LOGGER_ROLE"))
  const HEALTHCARE_PROVIDER_ROLE = keccak256(toBytes("HEALTHCARE_PROVIDER_ROLE"))
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`

  // Check manufacturer role
  const { data: isManufacturer } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [MANUFACTURER_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  // Check distributor role
  const { data: isDistributor } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [DISTRIBUTOR_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  // Check ML logger role
  const { data: isMLLogger } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [ML_LOGGER_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  // Check healthcare provider role
  const { data: isProvider } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [HEALTHCARE_PROVIDER_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  // Check admin role (on both contracts)
  const { data: isAdminDrug } = useReadContract({
    address: DRUG_REGISTRY_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  const { data: isAdminMedical } = useReadContract({
    address: MEDICAL_RECORD_ADDRESS,
    abi: [
      {
        inputs: [
          { internalType: "bytes32", name: "role", type: "bytes32" },
          { internalType: "address", name: "account", type: "address" },
        ],
        name: "hasRole",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, address!],
    query: {
      enabled: !!address,
    },
  })

  const isAdmin = isAdminDrug || isAdminMedical

  return {
    isManufacturer: !!isManufacturer,
    isDistributor: !!isDistributor,
    isMLLogger: !!isMLLogger,
    isProvider: !!isProvider,
    isAdmin: !!isAdmin,
    hasAnyRole: !!isManufacturer || !!isDistributor || !!isMLLogger || !!isProvider || !!isAdmin,
  }
}
