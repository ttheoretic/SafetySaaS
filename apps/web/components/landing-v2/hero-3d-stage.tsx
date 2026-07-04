"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { DashboardMockup } from "./dashboard-mockup"
import { Navbar } from "./navbar"
import { LogoCloud } from "./logo-cloud"
import { FeatureCardsSection } from "./feature-cards-section"
import { ProductDirectionSection } from "./product-direction-section"
import { WorkflowsSection } from "./workflows-section"
import { CTASection } from "./cta-section"
import { Footer } from "./footer"

export function Hero3DStage() {
  return (
    <>
      <section className="relative overflow-hidden" style={{ backgroundColor: "#09090B" }}>
        <Navbar />

        {/* Hero — full violet gradient stage, rounded card inset on black */}
        <div className="px-3 pt-20 sm:px-4">
          <div
            className="relative overflow-hidden rounded-[28px]"
            style={{
              background:
                "linear-gradient(180deg, #0a0913 0%, #131129 26%, #251d5e 55%, #43349f 78%, #6a55e6 100%)",
            }}
          >
            {/* bottom-center bloom behind the console */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                bottom: "-220px",
                transform: "translateX(-50%)",
                width: "1300px",
                height: "700px",
                background: "radial-gradient(ellipse at center, rgba(167, 139, 250, 0.5) 0%, transparent 65%)",
                filter: "blur(12px)",
              }}
            />
            {/* faint dotted texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
              }}
            />

            <div className="relative z-10 flex flex-col items-center px-6 pt-24 text-center sm:pt-28">
              {/* pill badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  href="/features/security-posture"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3.5 text-sm text-zinc-200 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  <span className="rounded-full bg-violet-500 px-2.5 py-0.5 text-xs font-medium text-white">New</span>
                  Cloud posture analysis
                  <span aria-hidden="true" className="text-zinc-400">&rarr;</span>
                </Link>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-7 max-w-4xl text-balance text-4xl font-medium leading-[1.08] text-white md:text-5xl lg:text-[60px]"
              >
                Map your architecture. Eliminate risk before it ships.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-300"
              >
                Connect your repositories, cloud, and infrastructure. Riscly surfaces security
                risks and bottlenecks &mdash; with fixes where they live.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
              >
                <Link
                  href="/login?mode=signup"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  Start scanning
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  See pricing
                </Link>
              </motion.div>

              {/* Risk console — cropped by the hero's bottom edge (Flowbyte-style) */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
                className="relative mt-16 w-full max-w-5xl"
                style={{ marginBottom: "-90px" }}
              >
                <div
                  className="overflow-hidden rounded-xl border border-white/15 text-left"
                  style={{ boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.75)" }}
                >
                  {/* Browser-style top bar */}
                  <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
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
          </div>
        </div>

        {/* Rest of the page on black */}
        <div className="relative z-10 flex flex-col pt-24">
          <LogoCloud />
          <FeatureCardsSection />
          <ProductDirectionSection />
          <WorkflowsSection />
          <CTASection />
          <Footer />
        </div>
      </section>
    </>
  )
}
