"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Zap } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-slate-950 to-cyan-900/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-cyan-600/5" />

      {/* Floating elements */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-purple-500/5 animate-float" />
      <div
        className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-cyan-500/5 animate-float"
        style={{ animationDelay: "1s" }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="glassmorphism border-slate-700 rounded-3xl p-8 md:p-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/20 mb-6"
            >
              <Zap className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm text-purple-300">Ready to Transform Healthcare?</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
              <span className="text-white">Join the Future of</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Secure Healthcare
              </span>
            </h2>

            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto text-pretty">
              Start securing pharmaceutical supply chains and medical records today. Experience the power of blockchain,
              zero-knowledge proofs, and AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/verify">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 px-8 py-4 text-lg rounded-xl transition-all duration-300 hover:scale-105 bg-transparent"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Try Verification
                </Button>
              </Link>
            </div>

            <div className="mt-8 text-sm text-slate-400">
              No credit card required • Free tier available • Enterprise ready
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
