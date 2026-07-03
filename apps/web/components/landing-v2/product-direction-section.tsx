"use client"

import { ChevronRight } from "lucide-react"

export function ProductDirectionSection() {
  return (
    <section className="relative py-40 px-6 md:px-12 lg:px-24">

      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-zinc-400 text-sm">Architecture intelligence</span>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Section heading */}
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-medium text-white mb-8 max-w-3xl"
          style={{
            letterSpacing: "-0.0325em",
            fontVariationSettings: '"opsz" 28',
            fontWeight: 538,
            lineHeight: 1.1,
          }}
        >
          See your entire system
        </h2>

        {/* Description */}
        <p className="text-zinc-400 text-lg max-w-md mb-16">
          <span className="text-white font-medium">A live map of services, data, and infrastructure.</span> Riscly
          traces every dependency and plots remediation across your stack.
        </p>

        {/* Architecture map — a flat, live map of services, data and infra */}
        <div className="relative">
          <div
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "900px",
              height: "480px",
              background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.14) 0%, transparent 65%)",
            }}
          />
        <div
          className="relative w-full mb-16 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden"
          style={{ boxShadow: "0 16px 64px -16px rgba(139, 92, 246, 0.25)" }}
        >
          {/* dot grid backdrop */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(113, 113, 122, 0.18) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <svg viewBox="0 0 960 380" className="relative w-full" role="img" aria-label="Architecture map">
            <defs>
              <marker id="pd-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill="#3f3f46" />
              </marker>
            </defs>

            {/* edges */}
            <g stroke="#3f3f46" strokeWidth="1.25" fill="none" markerEnd="url(#pd-arrow)">
              <path d="M150,190 L248,190" stroke="#8b5cf6" strokeOpacity="0.55" />
              <path d="M392,168 C430,130 460,116 506,104" />
              <path d="M392,196 L506,196" />
              <path d="M392,224 C430,262 460,276 506,288" />
              <path d="M646,104 C700,116 726,140 758,166" />
              <path d="M650,196 L758,196" />
              <path d="M646,288 C700,276 726,252 758,226" />
              <path d="M578,124 L578,172" strokeDasharray="4 4" markerEnd="none" />
              <path d="M578,220 L578,264" strokeDasharray="4 4" markerEnd="none" />
            </g>

            {/* internet entry */}
            <g>
              <rect x="44" y="166" width="106" height="48" rx="10" fill="#18181b" stroke="#3f3f46" />
              <circle cx="66" cy="190" r="4" fill="#a78bfa" />
              <text x="80" y="194" fill="#d4d4d8" fontSize="13">Internet</text>
            </g>

            {/* api gateway */}
            <g>
              <rect x="248" y="160" width="144" height="60" rx="10" fill="#18181b" stroke="#52525b" />
              <text x="268" y="186" fill="#fafafa" fontSize="13" fontWeight="500">api-gateway</text>
              <text x="268" y="204" fill="#71717a" fontSize="11">edge · TLS</text>
              {/* critical badge */}
              <circle cx="384" cy="166" r="7" fill="#ef4444" />
              <text x="384" y="169.5" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">2</text>
            </g>

            {/* services column */}
            <g>
              <rect x="506" y="76" width="140" height="52" rx="10" fill="#18181b" stroke="#3f3f46" />
              <text x="524" y="98" fill="#e4e4e7" fontSize="12.5" fontWeight="500">payments-api</text>
              <text x="524" y="114" fill="#71717a" fontSize="11">service</text>
              <circle cx="638" cy="82" r="6.5" fill="#ef4444" />
              <text x="638" y="85.5" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">1</text>

              <rect x="506" y="170" width="140" height="52" rx="10" fill="#18181b" stroke="#3f3f46" />
              <text x="524" y="192" fill="#e4e4e7" fontSize="12.5" fontWeight="500">auth-service</text>
              <text x="524" y="208" fill="#71717a" fontSize="11">service</text>
              <circle cx="638" cy="176" r="6.5" fill="#f59e0b" />
              <text x="638" y="179.5" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">3</text>

              <rect x="506" y="264" width="140" height="52" rx="10" fill="#18181b" stroke="#3f3f46" />
              <text x="524" y="286" fill="#e4e4e7" fontSize="12.5" fontWeight="500">orders-api</text>
              <text x="524" y="302" fill="#71717a" fontSize="11">service</text>
              <circle cx="638" cy="270" r="6.5" fill="#10b981" />
            </g>

            {/* data + infra column */}
            <g>
              <rect x="758" y="142" width="150" height="52" rx="10" fill="#18181b" stroke="#3f3f46" />
              <text x="776" y="164" fill="#e4e4e7" fontSize="12.5" fontWeight="500">postgres-prod</text>
              <text x="776" y="180" fill="#71717a" fontSize="11">database · PII</text>
              <circle cx="900" cy="148" r="6.5" fill="#f59e0b" />
              <text x="900" y="151.5" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">1</text>

              <rect x="758" y="236" width="150" height="52" rx="10" fill="#18181b" stroke="#3f3f46" />
              <text x="776" y="258" fill="#e4e4e7" fontSize="12.5" fontWeight="500">s3 · assets-prod</text>
              <text x="776" y="274" fill="#71717a" fontSize="11">object storage</text>
              <circle cx="900" cy="242" r="6.5" fill="#ef4444" />
              <text x="900" y="245.5" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">1</text>
            </g>

            {/* floating finding card pinned to the s3 node */}
            <g>
              <rect x="642" y="330" width="266" height="34" rx="8" fill="#18181b" stroke="#7f1d1d" />
              <circle cx="662" cy="347" r="4" fill="#ef4444" />
              <text x="674" y="351" fill="#d4d4d8" fontSize="11.5">CLD-208 · S3 bucket publicly readable</text>
              <path d="M833,330 L833,296" stroke="#7f1d1d" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            </g>
          </svg>

          {/* legend */}
          <div className="relative flex items-center gap-5 px-5 py-3 border-t border-zinc-800/70 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy</span>
            <span className="ml-auto hidden sm:block">Derived from your repos, cloud &amp; IaC — updated on every scan</span>
          </div>
        </div>
        </div>

        {/* Bottom two-column section */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left column - Manage projects end-to-end */}
          <div className="border-t border-r border-b border-zinc-800 pt-10 pr-10 pb-16">
            <h3 className="text-xl font-medium text-zinc-200 mb-3">Understand every service end-to-end</h3>
            <p className="text-zinc-500 text-base leading-relaxed mb-8">
              See ownership, dependencies, exposure, and open risks for each service in one consolidated view.
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h4 className="text-lg font-medium text-zinc-200 mb-5">Service Overview</h4>

              {/* Properties row */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-zinc-500 text-sm w-20">Exposure</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Internet-facing
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="2" y="2" width="12" height="12" rx="2" />
                    </svg>
                    payments-api
                  </span>
                  <div className="flex -space-x-1.5">
                    <div className="w-5 h-5 rounded-full bg-zinc-600 border border-zinc-900" />
                    <div className="w-5 h-5 rounded-full bg-zinc-500 border border-zinc-900" />
                    <div className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-900" />
                  </div>
                </div>
              </div>

              {/* Resources row */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-zinc-500 text-sm w-20">Data</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                    <span className="text-red-400">●</span>
                    PII
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs">
                    <span className="text-amber-500">●</span>
                    Payment records
                  </span>
                </div>
              </div>

              {/* Milestones row */}
              <div className="flex items-start gap-4">
                <span className="text-zinc-500 text-sm w-20 pt-1">Findings</span>
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-zinc-300 text-sm">
                    <span className="w-2.5 h-2.5 rotate-45 bg-red-500" />
                    Critical <span className="text-zinc-500">2 open</span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-300 text-sm">
                    <span className="w-2.5 h-2.5 rotate-45 bg-amber-500" />
                    Medium <span className="text-zinc-500">5 open</span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-400 text-sm">
                    <span className="w-2.5 h-2.5 rotate-45 border border-emerald-500 bg-transparent" />
                    Resolved <span className="text-zinc-500">18 this month</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Project updates */}
          <div className="border-t border-b border-zinc-800 pt-10 pl-10 pb-16">
            <h3 className="text-xl font-medium text-zinc-200 mb-3">Risk posture updates</h3>
            <p className="text-zinc-500 text-base leading-relaxed mb-8">
              Track the security health of every service with continuous, at-a-glance posture updates.
            </p>

            <div className="relative h-48">
              {/* Off track card (back) */}
              <div
                className="absolute rounded-lg bg-zinc-800/40 border border-zinc-700/30 px-4 py-2"
                style={{ top: 0, left: "10%", width: "80%" }}
              >
                <span className="flex items-center gap-2 text-zinc-500 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  Off track
                </span>
              </div>

              {/* At risk card (middle) */}
              <div
                className="absolute rounded-lg bg-zinc-800/60 border border-zinc-700/40 px-4 py-2"
                style={{ top: "30px", left: "5%", width: "85%" }}
              >
                <span className="flex items-center gap-2 text-zinc-400 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  At risk
                </span>
              </div>

              {/* On track card (front) */}
              <div
                className="absolute rounded-xl bg-zinc-800/90 border border-zinc-700/50 px-5 py-4"
                style={{ top: "60px", left: 0, width: "95%" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                  </span>
                  <span className="text-green-500 font-medium text-sm">Secure</span>
                </div>
                <p className="text-zinc-300 text-sm mb-3">All critical risks resolved. No new exposures detected.</p>
                <span className="text-zinc-500 text-xs">Updated 5m ago</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800">
          {/* Left column - Feature list */}
          <div className="border-r border-zinc-800 pt-16 pr-10 pb-16 flex flex-col justify-center">
            <h3 className="text-2xl font-medium text-zinc-200 mb-8 leading-tight">
              Investigate and prioritize
              <br />
              what to fix next
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-violet-500" />
                <span className="text-zinc-200 font-medium">Full risk context</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-violet-500/50" />
                <span className="text-zinc-400">Blast-radius analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-violet-500/30" />
                <span className="text-zinc-500">One-click fix to pull request</span>
              </div>
            </div>
          </div>

          {/* Right column - Document mockup */}
          <div className="pt-10 pl-10 pb-16">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 text-zinc-400 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0012.5 2h-9z" />
                </svg>
                <span>payments-api</span>
                <span className="text-zinc-600">›</span>
                <span>Risk report</span>
                <span className="ml-auto text-zinc-600">•••</span>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a2 2 0 100-4 2 2 0 000 4zM8 9c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>

                {/* Title with cursor */}
                <div className="mb-3 relative inline-block">
                  <span className="text-zinc-200 text-lg font-medium">Understand every</span>
                  <span className="relative mx-1">
                    <span className="text-zinc-200 text-lg font-medium bg-emerald-500/20 px-0.5">risk</span>
                    <span className="absolute -top-4 right-0 px-1.5 py-0.5 rounded text-[10px] bg-emerald-600 text-white">
                      nadia
                    </span>
                  </span>
                </div>

                {/* Description with cursor */}
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  Riscly explains the root cause, the affected{" "}
                  <span className="relative inline">
                    <span className="bg-violet-500/20 px-0.5">ser</span>
                    <span className="absolute -bottom-4 left-0 px-1.5 py-0.5 rounded text-[10px] bg-violet-600 text-white">
                      marco
                    </span>
                  </span>
                  vices, and the exact remediation. Every finding links back to the line, resource, or config that
                  triggered it.
                </p>

                {/* Placeholder text lines */}
                <div className="flex flex-col gap-2 mt-8">
                  <div className="flex gap-2 flex-wrap">
                    <div className="h-2 bg-zinc-700/50 rounded w-16" />
                    <div className="h-2 bg-zinc-700/30 rounded w-24" />
                    <div className="h-2 bg-zinc-700/50 rounded w-12" />
                    <div className="h-2 bg-orange-500/40 rounded w-20" />
                    <div className="h-2 bg-zinc-700/30 rounded w-16" />
                    <div className="h-2 bg-zinc-700/50 rounded w-28" />
                    <div className="h-2 bg-orange-500/40 rounded w-8" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="h-2 bg-zinc-700/30 rounded w-20" />
                    <div className="h-2 bg-zinc-700/50 rounded w-8" />
                    <div className="h-2 bg-zinc-700/30 rounded w-28" />
                    <div className="h-2 bg-orange-500/40 rounded w-12" />
                    <div className="h-2 bg-zinc-700/50 rounded w-16" />
                    <div className="h-2 bg-zinc-700/30 rounded w-24" />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <div className="h-2 bg-zinc-700/50 rounded w-24" />
                    <div className="h-2 bg-zinc-700/30 rounded w-16" />
                    <div className="h-2 bg-orange-500/40 rounded w-20" />
                    <div className="h-2 bg-zinc-700/50 rounded w-8" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 bg-zinc-700/50 rounded w-12" />
                    <div className="h-2 bg-zinc-700/30 rounded w-16" />
                  </div>
                  <div className="h-6" />
                  <div className="flex gap-2 flex-wrap">
                    <div className="h-2 bg-zinc-700/30 rounded w-24" />
                    <div className="h-2 bg-zinc-700/50 rounded w-16" />
                    <div className="h-2 bg-zinc-700/30 rounded w-20" />
                    <div className="h-2 bg-orange-500/40 rounded w-8" />
                    <div className="h-2 bg-zinc-700/50 rounded w-12" />
                    <div className="h-2 bg-zinc-700/30 rounded w-28" />
                    <div className="h-2 bg-orange-500/40 rounded w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16">
          {/* Initiatives */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-zinc-400"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="10" cy="10" r="8" />
                <circle cx="10" cy="10" r="4" />
                <circle cx="10" cy="10" r="1" fill="currentColor" />
              </svg>
              <span className="text-zinc-200 font-medium">Code security</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">Catch vulnerabilities and exposed secrets in code.</p>
          </div>

          {/* Cross-team projects */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-zinc-400"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="10" cy="10" r="8" />
                <path d="M2 10h16M10 2a15 15 0 010 16M10 2a15 15 0 000 16" />
              </svg>
              <span className="text-zinc-200 font-medium">Cloud &amp; infra</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">Detect misconfigurations across cloud and IaC.</p>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rotate-45 bg-zinc-400" />
              <span className="text-zinc-200 font-medium">Dependencies</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">Track CVEs and outdated packages across the tree.</p>
          </div>

          {/* Progress insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="10" width="3" height="8" rx="1" />
                <rect x="7" y="6" width="3" height="12" rx="1" />
                <rect x="12" y="8" width="3" height="10" rx="1" />
                <rect x="17" y="4" width="3" height="14" rx="1" />
              </svg>
              <span className="text-zinc-200 font-medium">Posture insights</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">Trend risk, coverage, and mean-time-to-fix over time.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
