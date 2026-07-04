import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { RisclyMark } from "@/components/brand/logo"

type FooterLink = { label: string; href: string }

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Platform: [
    { label: "Architecture Map", href: "/features/architecture-map" },
    { label: "Security Posture", href: "/features/security-posture" },
    { label: "Code Quality", href: "/features/code-quality" },
    { label: "One-click Fixes", href: "/features/one-click-fixes" },
    { label: "Attack Paths", href: "/features/attack-paths" },
    { label: "Failure Simulation", href: "/features/failure-simulation" },
    { label: "AI Assistant", href: "/features/ai-assistant" },
  ],
  Solutions: [
    { label: "Engineering teams", href: "/solutions/engineering" },
    { label: "Security teams", href: "/solutions/security-teams" },
    { label: "Founders & CTOs", href: "/solutions/founders" },
    { label: "Compliance & Audit", href: "/solutions/compliance" },
    { label: "Incident prevention", href: "/solutions/incident-prevention" },
    { label: "Pricing", href: "/pricing" },
  ],
  Resources: [
    { label: "Docs", href: "/docs" },
    { label: "API Reference", href: "/docs/api" },
    { label: "Data & Security", href: "/docs/security" },
    { label: "FAQ", href: "/docs/faq" },
    { label: "Changelog", href: "/changelog" },
    { label: "Roadmap", href: "/roadmap" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Terms", href: "/legal/terms" },
    { label: "Cookies", href: "/legal/cookies" },
    { label: "Subprocessors", href: "/legal/subprocessors" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-16 px-6" style={{ backgroundColor: "#09090B" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <RisclyMark className="w-5 h-5 text-blue-500" />
              <span className="text-white font-semibold text-sm">Riscly</span>
            </Link>
            <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
              Security &amp; architecture intelligence for software systems.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-medium text-sm mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-zinc-800/70 pt-6 text-xs text-zinc-600">
          © {new Date().getFullYear()} Riscly. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
