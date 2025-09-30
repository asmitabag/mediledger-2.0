"use client"

import { motion } from "framer-motion"
import { Shield, Truck, Activity, Brain, Lock, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Shield,
    title: "Drug Verification",
    description:
      "Instantly verify pharmaceutical authenticity and track complete supply chain history with blockchain immutability.",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Lock,
    title: "Medical Records",
    description:
      "Secure patient data with zero-knowledge proofs, ensuring privacy while enabling verifiable healthcare records.",
    gradient: "from-pink-500 to-pink-600",
  },
  {
    icon: Truck,
    title: "Supply Chain Tracking",
    description:
      "Real-time tracking of pharmaceutical products from manufacturer to patient with complete transparency.",
    gradient: "from-cyan-500 to-cyan-600",
  },
  {
    icon: Brain,
    title: "AI Anomaly Detection",
    description:
      "Advanced machine learning algorithms detect suspicious patterns and potential security threats automatically.",
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    icon: Activity,
    title: "Healthcare Provider Tools",
    description:
      "Comprehensive dashboard for healthcare providers to manage patient records and verify drug authenticity.",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Search,
    title: "Public Verification",
    description:
      "Anyone can verify drug authenticity and view supply chain history through our public verification portal.",
    gradient: "from-orange-500 to-orange-600",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Comprehensive Healthcare
            </span>
            <br />
            <span className="text-white">Blockchain Solutions</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto text-pretty">
            From supply chain transparency to privacy-preserving medical records, MediLedger provides end-to-end
            blockchain solutions for healthcare.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="glassmorphism border-slate-700 hover:border-slate-600 transition-all duration-300 hover:scale-105 group h-full">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-300 text-pretty">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
