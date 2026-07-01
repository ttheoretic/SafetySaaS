import { ShieldCheck } from "lucide-react"

export function Footer() {
  const footerLinks = {
    Platform: ["Architecture Map", "Code Security", "Cloud Posture", "Infrastructure", "Dependencies", "Remediation", "API"],
    Solutions: ["Startups", "Enterprise", "Compliance", "AppSec Teams", "Platform Teams", "DevOps", "Pricing"],
    Company: ["About", "Customers", "Careers", "Blog", "Trust Center", "Security", "Brand"],
    Resources: ["Docs", "Changelog", "Status", "Report vulnerability", "DPA", "Privacy", "Terms"],
    Connect: ["Contact us", "Community", "X (Twitter)", "GitHub", "LinkedIn"],
  }

  return (
    <footer className="border-t border-zinc-800 py-16 px-6" style={{ backgroundColor: "#09090B" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Logo */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold text-sm">Riscly</span>
            </div>
            <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
              Security &amp; architecture intelligence for software systems.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-medium text-sm mb-4">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
