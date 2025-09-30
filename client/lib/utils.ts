import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { keccak256, encodePacked } from "viem"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString()
}

export function formatRelativeTime(timestamp: bigint): string {
  const now = Date.now()
  const time = Number(timestamp) * 1000
  const diff = now - time

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function generateBatchId(drugName: string, manufacturer: `0x${string}`, timestamp: number): `0x${string}` {
  return keccak256(encodePacked(["string", "address", "uint256"], [drugName, manufacturer, BigInt(timestamp)]))
}

export function getEtherscanUrl(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`
}

export function getAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text)
}
