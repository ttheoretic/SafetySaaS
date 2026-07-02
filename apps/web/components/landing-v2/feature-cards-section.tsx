"use client"

import { motion } from "framer-motion"
import { ChevronRight, Plus } from "lucide-react"

const featureCards = [
  {
    title: "Automatic architecture mapping",
    illustration: (
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: "260px",
          backgroundImage: "radial-gradient(rgba(113,113,122,0.22) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <svg viewBox="0 0 336 260" className="w-full h-full" aria-label="Architecture dependency graph">
          <g stroke="#3f3f46" strokeWidth="1.25" fill="none">
            <path d="M92,130 C130,130 130,74 168,74" />
            <path d="M92,130 L168,130" />
            <path d="M92,130 C130,130 130,186 168,186" />
            <path d="M232,74 C258,74 258,110 276,116" />
            <path d="M232,186 C258,186 258,150 276,144" />
          </g>
          <g>
            <rect x="36" y="112" width="56" height="36" rx="8" fill="#18181b" stroke="#8b5cf6" strokeOpacity="0.6" />
            <circle cx="52" cy="130" r="3" fill="#a78bfa" />
            <text x="60" y="134" fill="#e4e4e7" fontSize="11">api</text>
            <rect x="168" y="56" width="64" height="36" rx="8" fill="#18181b" stroke="#3f3f46" />
            <circle cx="184" cy="74" r="3" fill="#10b981" />
            <text x="192" y="78" fill="#d4d4d8" fontSize="11">cache</text>
            <rect x="168" y="112" width="64" height="36" rx="8" fill="#18181b" stroke="#3f3f46" />
            <circle cx="184" cy="130" r="3" fill="#f59e0b" />
            <text x="192" y="134" fill="#d4d4d8" fontSize="11">queue</text>
            <rect x="168" y="168" width="64" height="36" rx="8" fill="#18181b" stroke="#3f3f46" />
            <circle cx="184" cy="186" r="3" fill="#ef4444" />
            <text x="192" y="190" fill="#d4d4d8" fontSize="11">db</text>
            <rect x="276" y="102" width="48" height="56" rx="8" fill="#18181b" stroke="#3f3f46" strokeDasharray="4 3" />
            <text x="286" y="134" fill="#71717a" fontSize="10">ext</text>
          </g>
        </svg>
      </div>
    ),
  },
  {
    title: "Continuous risk analysis",
    illustration: (
      <div className="relative w-full overflow-hidden" style={{ height: "260px" }}>
        <svg viewBox="0 0 336 260" className="w-full h-full" aria-label="Security scanning radar">
          <defs>
            <linearGradient id="fc-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="#27272a">
            <circle cx="168" cy="130" r="40" />
            <circle cx="168" cy="130" r="72" />
            <circle cx="168" cy="130" r="104" />
          </g>
          <path d="M168,130 L272,130 A104,104 0 0,0 241,56 Z" fill="url(#fc-sweep)" />
          <line x1="168" y1="130" x2="272" y2="130" stroke="#8b5cf6" strokeOpacity="0.7" strokeWidth="1.5" />
          <circle cx="168" cy="130" r="3.5" fill="#a78bfa" />
          <circle cx="214" cy="92" r="5" fill="#ef4444" />
          <circle cx="128" cy="160" r="4.5" fill="#f59e0b" />
          <circle cx="108" cy="96" r="4" fill="#10b981" />
          <circle cx="222" cy="176" r="4" fill="#71717a" />
        </svg>
      </div>
    ),
  },
  {
    title: "Contextual fixes in your code",
    illustration: (
      <div className="relative w-full overflow-hidden px-6 pt-8" style={{ height: "260px" }}>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-3.5 font-mono text-[10.5px] leading-5" aria-label="Suggested code fix">
          <div className="text-zinc-500">charge.ts</div>
          <div className="mt-1.5 rounded bg-red-500/10 px-1.5 text-red-300/90">{"- db.raw(`... ${id}`)"}</div>
          <div className="rounded bg-violet-500/15 px-1.5 text-violet-300">+ db.raw(`... ?`, [id])</div>
          <div className="mt-2 text-zinc-600">// parameterized — injection closed</div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-violet-300">
            Apply fix → pull request
          </div>
        </div>
      </div>
    ),
  },
]

export function FeatureCardsSection() {
  return (
    <div className="relative z-20 py-40" style={{ backgroundColor: "#09090B" }}>
      <div className="w-full flex justify-center px-6">
        <div className="w-full max-w-5xl">
          {/* Header row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] text-white max-w-md"
              style={{
                letterSpacing: "-0.0325em",
                fontVariationSettings: '"opsz" 28',
                fontWeight: 538,
                lineHeight: 1.1,
              }}
            >
              Built for security and platform teams
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-md"
            >
              <p className="text-zinc-400 leading-relaxed">
                Riscly continuously connects your repositories, cloud, infrastructure, and DevOps tools, then turns raw
                signal into a clear picture of what is at risk and how to fix it.{" "}
                <a href="/docs/guides/scanning" className="text-white inline-flex items-center gap-1 hover:underline">
                  See how it works <ChevronRight className="w-4 h-4" />
                </a>
              </p>
            </motion.div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featureCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group overflow-hidden relative flex flex-col justify-end"
                style={{
                  aspectRatio: "336 / 360",
                  borderRadius: "30px",
                  height: "360px",
                  isolation: "isolate",
                }}
              >
                <div
                  className="absolute top-0 left-0 w-full flex"
                  style={{
                    maskImage: "linear-gradient(#000 70%, transparent 90%)",
                    WebkitMaskImage: "linear-gradient(#000 70%, transparent 90%)",
                  }}
                >
                  {card.illustration}
                </div>
                <div
                  className="relative z-10 flex items-center justify-between w-full"
                  style={{ padding: "0 24px 40px", gap: "16px" }}
                >
                  <h3 className="text-white font-medium text-lg leading-tight">{card.title}</h3>
                  <div className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:border-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
