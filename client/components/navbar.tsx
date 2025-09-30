"use client";

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Truck, Building2, Settings } from "lucide-react";

export function Navbar() {
  const { isSignedIn } = useUser();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-800 glassmorphism">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              MediLedger 2.0
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {isSignedIn && (
              <div className="hidden md:flex items-center space-x-2">
                <Link href="/dashboard/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Link href="/dashboard/manufacturer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Manufacturer
                  </Button>
                </Link>
                <Link href="/dashboard/distributor">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Distributor
                  </Button>
                </Link>
                <Link href="/dashboard/healthcare">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Provider
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/verify">
              <Button variant="outline" size="sm">
                Verify Drug
              </Button>
            </Link>

            {isSignedIn ? (
              <div className="flex items-center space-x-3">
                <ConnectButton />
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
