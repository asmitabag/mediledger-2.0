import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { CustomCursor } from "@/components/custom-cursor";
import { Navbar } from "@/components/navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MediLedger 2.0 - Healthcare Blockchain Platform",
  description:
    "Secure pharmaceutical supply chain tracking and medical record management with zero-knowledge proofs",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: "light", // 👈 forces light theme globally
      }}
    >
      <html lang="en" className={`${inter.variable} antialiased`}>
        <body className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
          <Providers>
            <CustomCursor />
            <div className="relative">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
              <div className="relative">
                <Navbar />
                <main>{children}</main>
              </div>
            </div>
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
