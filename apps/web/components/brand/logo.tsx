/**
 * Riscly brand mark — a custom "waypoint" glyph: an outlined diamond with a
 * solid inner diamond. Reads as a located node on an architecture map (the
 * product) and stays crisp at 16–24px. Monochrome via currentColor so each
 * surface colors it (white on dark, blue as accent, etc.).
 */
export function RisclyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.75 L21.25 12 L12 21.25 L2.75 12 Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 8.2 L15.8 12 L12 15.8 L8.2 12 Z" fill="currentColor" />
    </svg>
  )
}
