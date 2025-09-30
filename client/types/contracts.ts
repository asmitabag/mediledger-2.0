export interface DrugBatch {
  batchId: `0x${string}`
  manufacturer: `0x${string}`
  drugName: string
  manufacturingDate: bigint
  expiryDate: bigint
  isActive: boolean
  currentOwner: `0x${string}`
}

export interface Transfer {
  from: `0x${string}`
  to: `0x${string}`
  timestamp: bigint
  location: string
}

export interface AnomalyLog {
  batchId: `0x${string}`
  predictionHash: `0x${string}`
  logger: `0x${string}`
  timestamp: bigint
  anomalyType: string
}

export interface ZKProof {
  a: [bigint, bigint]
  b: [[bigint, bigint], [bigint, bigint]]
  c: [bigint, bigint]
  input: [bigint]
}

export type UserRole = "manufacturer" | "distributor" | "provider" | "admin" | null

export interface AnomalyDetection {
  hasAnomaly: boolean
  anomalyType:
    | "transfer_frequency"
    | "time_gap"
    | "expired_circulation"
    | "location_anomaly"
    | "ownership_churn"
    | "none"
  severity: "low" | "medium" | "high"
  description: string
}
