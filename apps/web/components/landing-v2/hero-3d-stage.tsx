"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { DashboardMockup } from "./dashboard-mockup"
import { Navbar } from "./navbar"
import { LogoCloud } from "./logo-cloud"
import { FeatureCardsSection } from "./feature-cards-section"
import { AISection } from "./ai-section"
import { ProductDirectionSection } from "./product-direction-section"
import { WorkflowsSection } from "./workflows-section"
import { CTASection } from "./cta-section"
import { Footer } from "./footer"

export function Hero3DStage() {
  return (
    <>
      <section className="relative min-h-screen overflow-hidden" style={{ backgroundColor: "#09090B" }}>
        <Navbar />

        {/* Subtle glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -30%)",
            width: "1200px",
            height: "800px",
            background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.14) 0%, transparent 70%)",
          }}
        />

        {/* Main content */}
        <div className="relative z-10 pt-28 flex flex-col">
          {/* Hero text - contained and centered */}
          <div className="w-full flex justify-center px-6 mt-16">
            <div className="w-full max-w-4xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-5xl lg:text-[56px] font-medium text-white leading-[1.1] text-balance"
              >
                Riscly maps your architecture and{" "}
                <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  eliminates risk
                </span>{" "}
                before it ships
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-6 text-lg text-zinc-400"
              >
                Connect your repositories, cloud, and infrastructure.
                <br />
                Riscly surfaces security risks, vulnerabilities, and bottlenecks &mdash; with fixes where they live.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-8 flex items-center gap-6"
              >
                <Link
                  href="/login?mode=signup"
                  className="px-5 py-2.5 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-100 transition-colors text-sm"
                >
                  Start scanning
                </Link>
                <Link
                  href="/features/security-posture"
                  className="text-zinc-300 font-medium hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  <span className="text-violet-400">New:</span> Cloud posture analysis
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Risk console — flat (top-down), fully visible */}
          <div className="w-full flex justify-center px-6 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
              className="w-full max-w-6xl"
            >
              <div
                className="relative rounded-xl border border-zinc-800 overflow-hidden"
                style={{
                  boxShadow: "0 24px 80px -24px rgba(139, 92, 246, 0.3), 0 12px 48px -16px rgba(0, 0, 0, 0.8)",
                }}
              >
                {/* Browser-style top bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="mx-auto flex items-center gap-1.5 rounded-md bg-zinc-800/70 px-3 py-1 text-[11px] text-zinc-500">
                    app.riscly.ai
                  </div>
                </div>
                <div className="aspect-[16/9] w-full">
                  <DashboardMockup />
                </div>
              </div>
            </motion.div>
          </div>

          <LogoCloud />
          <FeatureCardsSection />
          <AISection />
          <ProductDirectionSection />
          <WorkflowsSection />
          <CTASection />
          <Footer />
        </div>
      </section>
    </>
  )
}
