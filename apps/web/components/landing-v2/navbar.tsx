"use client"

import { useState } from "react"
import Link from "next/link"
import { ShieldCheck, Menu, X } from "lucide-react"
import { MegaMenu, MOBILE_SECTIONS } from "@/components/landing/landing-megamenu"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-[#09090B]/80 backdrop-blur-md">
      <div className="w-full flex justify-center px-6 py-3.5">
        <div className="w-full max-w-5xl flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">Riscly</span>
            </Link>
            {/* Mega menu: Platform / Solutions / Resources + Docs / Pricing.
                Uses semantic tokens, so it renders in the landing theme. */}
            <MegaMenu />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className="text-sm text-white bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 rounded-md border border-zinc-700 transition-colors"
            >
              Start scanning
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden text-zinc-400 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      {mobileOpen && (
        <div className="md:hidden max-h-[70vh] overflow-y-auto border-t border-zinc-800 bg-[#09090B] px-6 py-4">
          {MOBILE_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {section.label}
              </div>
              <div className="flex flex-col">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col border-t border-zinc-800 pt-3">
            <Link href="/docs" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
              Docs
            </Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
              Pricing
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
              Log in
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
