"use client"

import { motion } from "framer-motion"
import { GitBranch, Cloud, Boxes, Database, Server, Zap, Container, KeyRound } from "lucide-react"

// Honest strip: these are the systems Riscly actually connects to and reads —
// not fake customer logos.
const CONNECTORS = [
  { icon: GitBranch, label: "GitHub" },
  { icon: GitBranch, label: "GitLab" },
  { icon: Cloud, label: "AWS" },
  { icon: Zap, label: "Vercel" },
  { icon: Database, label: "Supabase" },
  { icon: Boxes, label: "Terraform" },
  { icon: Container, label: "Kubernetes" },
  { icon: KeyRound, label: "Stripe" },
]

export function LogoCloud() {
  return (
    <div className="relative z-20 pb-24 pt-8" style={{ backgroundColor: "#09090B" }}>
      <div className="w-full flex justify-center px-6">
        <div className="w-full max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-lg text-zinc-300 mb-2"
          >
            Connects to the stack you already run.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-zinc-500 mb-14"
          >
            Read-only wherever possible — your code never leaves the pipeline.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-14 gap-y-8 items-center justify-items-center"
          >
            {CONNECTORS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-zinc-500 transition-colors hover:text-blue-300"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-lg">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
