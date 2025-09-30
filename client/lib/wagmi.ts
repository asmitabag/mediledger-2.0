import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { sepolia } from "wagmi/chains"

let wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null

export const config =
  wagmiConfig ||
  (wagmiConfig = getDefaultConfig({
    appName: "MediLedger 2.0",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [sepolia],
    ssr: true,
    walletConnectOptions: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
      metadata: {
        name: "MediLedger 2.0",
        description: "Healthcare Blockchain Platform",
        url: typeof window !== "undefined" ? window.location.origin : "https://mediledger.app",
        icons: ["https://mediledger.app/icon.png"],
      },
    },
  }))
