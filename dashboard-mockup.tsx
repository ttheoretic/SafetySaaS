"use client"

import type React from "react"
import { motion } from "framer-motion"
import {
  ShieldAlert,
  ShieldCheck,
  Network,
  GitBranch,
  Cloud,
  Server,
  Database,
  Boxes,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  MoreHorizontal,
  Cpu,
  HelpCircle,
  Wand2,
  Lock,
} from "lucide-react"

export function DashboardMockup() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.5,
      },
    },
  }

  const panelVariants = {
    hidden: {
      opacity: 0,
      x: 100,
      y: -80,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <motion.div
      className="w-full h-full bg-zinc-950 flex overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Sidebar */}
      <motion.div
        className="w-[220px] h-full bg-zinc-900/80 border-r border-zinc-800/50 flex flex-col shrink-0"
        variants={panelVariants}
      >
        {/* Logo */}
        <div className="p-3 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-semibold text-sm">Riscly</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-auto" />
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-800/50 rounded-md text-zinc-500 text-xs">
            <Search className="w-3.5 h-3.5" />
            <span>Search risks...</span>
            <span className="ml-auto text-[10px] bg-zinc-700/50 px-1.5 py-0.5 rounded">⌘K</span>
          </div>
        </div>

        {/* Main nav */}
        <div className="px-3 space-y-0.5">
          <NavItem icon={ShieldAlert} label="Risks" badge={12} active />
          <NavItem icon={Network} label="Architecture Map" />
        </div>

        {/* Workspace section */}
        <div className="mt-5 px-3">
          <div className="px-2 py-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
            Sources
          </div>
          <div className="space-y-0.5 mt-1">
            <NavItem icon={GitBranch} label="Repositories" hasSubmenu />
            <NavItem icon={Cloud} label="Cloud Providers" hasSubmenu />
            <NavItem icon={Server} label="Infrastructure" hasSubmenu />
            <NavItem icon={Database} label="Databases" hasSubmenu />
          </div>
        </div>

        {/* Favorites section */}
        <div className="mt-5 px-3">
          <div className="px-2 py-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
            Connected
          </div>
          <div className="space-y-0.5 mt-1">
            <NavItem icon={GitBranch} label="acme/payments-api" color="text-cyan-400" />
            <NavItem icon={Cloud} label="AWS Production" color="text-orange-400" />
            <NavItem icon={Boxes} label="Terraform Core" color="text-emerald-400" />
          </div>
        </div>

        {/* Teams section */}
        <div className="mt-5 px-3 flex-1">
          <div className="px-2 py-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
            Your Teams
          </div>
          <div className="space-y-0.5 mt-1">
            <NavItem icon={Lock} label="Security" hasSubmenu />
            <NavItem icon={Cpu} label="Platform" hasSubmenu />
          </div>
        </div>

        {/* Bottom */}
        <div className="p-3 border-t border-zinc-800/50">
          <NavItem icon={HelpCircle} label="Help & Support" />
        </div>
      </motion.div>

      {/* Risk List */}
      <motion.div
        className="w-[320px] h-full bg-zinc-900/40 border-r border-zinc-800/50 flex flex-col shrink-0"
        variants={panelVariants}
      >
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Risks</h3>
          <div className="flex items-center gap-2">
            <button className="text-zinc-500 hover:text-white transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide">
          <RiskItem
            id="SEC-431"
            title="SQL injection in payments handler"
            subtitle="acme/payments-api · charge.ts"
            time="2m"
            source="code"
            severity="critical"
            active
          />
          <RiskItem
            id="CLD-208"
            title="S3 bucket publicly readable"
            subtitle="AWS Production · assets-prod"
            time="14m"
            source="cloud"
            severity="critical"
          />
          <RiskItem
            id="DEP-097"
            title="lodash 4.17.11 has known CVE"
            subtitle="Dependency · CVE-2019-10744"
            time="1h"
            source="dependency"
            severity="high"
          />
          <RiskItem
            id="INF-052"
            title="Security group allows 0.0.0.0/0:22"
            subtitle="Terraform Core · network.tf"
            time="3h"
            source="infra"
            severity="high"
          />
          <RiskItem
            id="SEC-428"
            title="Hardcoded API key in commit"
            subtitle="acme/web · config.ts"
            time="5h"
            source="code"
            severity="medium"
          />
          <RiskItem
            id="PERF-014"
            title="N+1 query on /orders endpoint"
            subtitle="Performance · orders.service.ts"
            time="1d"
            source="perf"
            severity="medium"
          />
          <RiskItem
            id="ARCH-006"
            title="Circular dependency between modules"
            subtitle="Architecture · billing ↔ auth"
            time="1d"
            source="arch"
            severity="low"
          />
          <RiskItem
            id="SEC-410"
            title="Missing rate limiting on auth"
            subtitle="Resolved by nadia"
            time="2d"
            source="code"
            severity="resolved"
          />
        </div>
      </motion.div>

      {/* Detail Panel */}
      <motion.div className="flex-1 h-full bg-zinc-950 flex flex-col overflow-hidden" variants={panelVariants}>
        {/* Header breadcrumb */}
        <div className="px-5 py-3 border-b border-zinc-800/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500">acme/payments-api</span>
            <span className="text-zinc-600">›</span>
            <span className="text-cyan-400">charge.ts</span>
            <span className="text-zinc-600">›</span>
            <span className="text-zinc-300">SEC-431</span>
          </div>
          <MoreHorizontal className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-auto scrollbar-hide">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider bg-red-500/15 text-red-400 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Critical
            </span>
            <span className="text-[10px] text-zinc-500">CWE-89 · SQL Injection</span>
          </div>
          <h2 className="text-white text-xl font-semibold mb-5">SQL injection in payments handler</h2>

          {/* Vulnerable code block */}
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Detected</div>
          <div className="bg-zinc-900/80 rounded-lg p-4 text-[11px] font-mono mb-4 border border-red-500/20">
            <div className="space-y-1">
              <div>
                <span className="text-purple-400">const</span>
                <span className="text-zinc-400"> query </span>
                <span className="text-zinc-500">=</span>
                <span className="text-emerald-300"> `SELECT * FROM charges</span>
              </div>
              <div className="bg-red-500/10 -mx-2 px-2 rounded">
                <span className="text-emerald-300"> WHERE user_id = ${"{"}</span>
                <span className="text-amber-300">req.params.id</span>
                <span className="text-emerald-300">{"}"}`</span>
                <span className="text-zinc-400">;</span>
              </div>
              <div>
                <span className="text-blue-400">await</span>
                <span className="text-cyan-300"> db</span>
                <span className="text-zinc-400">.</span>
                <span className="text-amber-300">raw</span>
                <span className="text-zinc-400">(query);</span>
              </div>
            </div>
          </div>

          {/* Contextual fix */}
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-400 mb-2">
            <Wand2 className="w-3 h-3" /> Suggested fix
          </div>
          <div className="bg-zinc-900/80 rounded-lg p-4 text-[11px] font-mono mb-5 border border-cyan-500/20">
            <div className="space-y-1">
              <div className="bg-cyan-500/10 -mx-2 px-2 rounded">
                <span className="text-purple-400">const</span>
                <span className="text-zinc-400"> query </span>
                <span className="text-zinc-500">=</span>
                <span className="text-emerald-300"> `SELECT * FROM charges WHERE user_id = ?`</span>
                <span className="text-zinc-400">;</span>
              </div>
              <div>
                <span className="text-blue-400">await</span>
                <span className="text-cyan-300"> db</span>
                <span className="text-zinc-400">.</span>
                <span className="text-amber-300">raw</span>
                <span className="text-zinc-400">(query, [</span>
                <span className="text-amber-300">req.params.id</span>
                <span className="text-zinc-400">]);</span>
              </div>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-sm py-2.5 rounded-md transition-colors mb-5 border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
            Apply fix &amp; open pull request
          </button>

          {/* Activity */}
          <div className="pt-4 border-t border-zinc-800/50">
            <div className="text-xs text-zinc-500 font-medium mb-3 uppercase tracking-wider">Activity</div>
            <div className="space-y-3">
              <ActivityItem
                avatar="https://i.pravatar.cc/24?img=12"
                name="Riscly Scanner"
                action="flagged this risk during"
                from="scheduled scan"
                time="2 minutes ago"
              />
              <ActivityItem
                avatar="https://i.pravatar.cc/24?img=32"
                name="nadia"
                action="assigned this to"
                from="Security"
                time="just now"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  hasSubmenu,
  color,
}: {
  icon: React.ElementType
  label: string
  badge?: number
  active?: boolean
  hasSubmenu?: boolean
  color?: string
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
      }`}
    >
      <Icon className={`w-4 h-4 ${color || ""}`} />
      <span className="flex-1 text-xs truncate">{label}</span>
      {badge && (
        <span className="bg-cyan-500/80 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-medium px-1">
          {badge}
        </span>
      )}
      {hasSubmenu && <ChevronRight className="w-3 h-3 text-zinc-600" />}
    </div>
  )
}

function RiskItem({
  id,
  title,
  subtitle,
  time,
  source,
  severity,
  active,
}: {
  id?: string
  title: string
  subtitle?: string
  time?: string
  source: string
  severity: string
  active?: boolean
}) {
  const severityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-zinc-500",
    resolved: "bg-emerald-500",
  }

  const sourceIcons: Record<string, React.ElementType> = {
    code: GitBranch,
    cloud: Cloud,
    dependency: Boxes,
    infra: Server,
    perf: Cpu,
    arch: Network,
  }

  const SourceIcon = sourceIcons[source] || ShieldAlert

  return (
    <div
      className={`px-4 py-3 border-b border-zinc-800/30 cursor-pointer transition-colors ${
        active ? "bg-zinc-800/50" : "hover:bg-zinc-800/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center shrink-0 mt-0.5">
          <SourceIcon className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {id && <span className="text-zinc-500 text-[10px]">{id}</span>}
            <div className={`w-2 h-2 rounded-full ${severityColors[severity] || "bg-zinc-500"}`} />
            <span className="text-zinc-600 text-[10px] capitalize">{severity}</span>
          </div>
          <p className="text-white text-xs truncate leading-tight">{title}</p>
          {subtitle && <p className="text-zinc-500 text-[10px] mt-0.5 truncate">{subtitle}</p>}
        </div>
        {time && <span className="text-zinc-600 text-[10px] shrink-0">{time}</span>}
      </div>
    </div>
  )
}

function ActivityItem({
  avatar,
  name,
  action,
  from,
  to,
  time,
}: {
  avatar: string
  name: string
  action: string
  from: string
  to?: string
  time: string
}) {
  return (
    <div className="flex items-start gap-2">
      <img src={avatar || "/placeholder.svg"} alt="" className="w-5 h-5 rounded-full" />
      <div className="flex-1">
        <p className="text-zinc-400 text-xs">
          <span className="text-white">{name}</span>
          <span className="text-zinc-500"> {action} </span>
          <span className="text-zinc-300">{from}</span>
          {to && (
            <>
              <span className="text-zinc-500"> to </span>
              <span className="text-zinc-300">{to}</span>
            </>
          )}
        </p>
        <p className="text-zinc-600 text-[10px] mt-0.5">{time}</p>
      </div>
    </div>
  )
}
