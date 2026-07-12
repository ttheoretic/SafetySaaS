/**
 * Riscly brand mark — two stacked layers: a rounded diamond in a cyan→blue
 * gradient floating above a chevron band that runs blue→violet. Reads as
 * "layers of your stack" and carries its own color, so it sits directly on any
 * surface (no tile behind it needed).
 */
export function RisclyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rm-top" x1="10" y1="4" x2="38" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2BAAFF" />
          <stop offset="1" stopColor="#1D63FF" />
        </linearGradient>
        <linearGradient id="rm-base" x1="6" y1="34" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D3FD8" />
          <stop offset="1" stopColor="#7B3FF2" />
        </linearGradient>
      </defs>
      {/* base layer — chevron band, blue → violet */}
      <path
        d="M6 29.5 L24 38.5 L42 29.5"
        stroke="url(#rm-base)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* top layer — rounded diamond, cyan → blue */}
      <rect
        x="12"
        y="5"
        width="24"
        height="24"
        rx="5"
        transform="rotate(45 24 17)"
        fill="url(#rm-top)"
      />
    </svg>
  )
}
