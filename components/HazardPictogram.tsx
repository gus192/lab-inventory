import type { ReactNode } from 'react'

/**
 * GHS-style hazard pictograms: a red diamond frame with a black symbol inside,
 * matching the official Globally Harmonized System look. The seven GHS symbols we
 * use are authentic categories; "Moisture sensitive" / "Air sensitive" are lab
 * handling notes (no official GHS pictogram) so they get simple custom glyphs.
 */

// Inner symbol artwork, drawn upright in a 24×24 box and centered in the diamond.
const SYMBOLS: Record<string, ReactNode> = {
  // GHS02 — flame
  Flammable: (
    <path
      d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 015.648 6.61a.75.75 0 00-1.152.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133.998a5.99 5.99 0 011.925-3.547 3.75 3.75 0 013.255 3.721z"
      fill="currentColor"
    />
  ),
  // GHS03 — flame over circle (oxidizer)
  Oxidizer: (
    <g>
      <circle cx="12" cy="16.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5c2.2 3 3.4 4.4 1.5 7.4 1.7-.7 1.9-2.9.5-4.3 2.1 1 2.9 3.9.6 6-2 1.7-5.2 1.3-6.4-.8-1-1.8-.4-3.5 1-4.9-.4 1.3.2 2.6 1.4 3C11 6 11.8 4.4 12 2.5z"
        fill="currentColor"
      />
    </g>
  ),
  // GHS01 — exploding bomb / burst (reactive / explosive)
  Reactive: (
    <path
      d="M12 1.8l2.1 5 4.2-2.7-1.6 4.7 5 .3-4.1 3.1 3.4 3.8-4.9-1.4.4 5.1-3.6-3.6-2.5 4.6-1.2-5-4.8 1.9 2.2-4.6-4.9-1.6 4.8-1.7-3.2-4 5 1z"
      fill="currentColor"
    />
  ),
  // GHS05 — corrosion: two tubes dripping onto a surface and a hand
  Corrosive: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 3l5 3.2" />
      <path d="M2.5 4.7l5 3.2" />
      <path d="M20.5 3l-5 3.2" />
      <path d="M21.5 4.7l-5 3.2" />
      <path d="M8 9.5v2.3" />
      <path d="M16 9.5v2.3" />
      <path d="M2.5 14.5h7l-1.2 2.3a1.8 1.8 0 11-2.6-1" />
      <path d="M14 14.5h7" />
      <path d="M15.5 14.5v3M18 14.5v3M20.5 14.5v3" />
    </g>
  ),
  // GHS06 — skull and crossbones (acute toxicity)
  Toxic: (
    <g>
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="6" y1="16.5" x2="18" y2="22.5" />
        <line x1="18" y1="16.5" x2="6" y2="22.5" />
      </g>
      <path
        d="M12 2.6c-3.6 0-6.4 2.7-6.4 6 0 2 1 3.7 2.5 4.7v1.6A1.2 1.2 0 009.3 16.1h.5v-1.2a.8.8 0 011.6 0v1.2h1.2v-1.2a.8.8 0 011.6 0v1.2h.5a1.2 1.2 0 001.2-1.2v-1.6c1.5-1 2.5-2.7 2.5-4.7 0-3.3-2.8-6-6.4-6z"
        fill="currentColor"
      />
      <circle cx="9.4" cy="8.7" r="1.7" fill="white" />
      <circle cx="14.6" cy="8.7" r="1.7" fill="white" />
      <path d="M12 10.2l-1.1 2.1h2.2z" fill="white" />
    </g>
  ),
  // GHS07 — exclamation mark (irritant / harmful)
  Irritant: (
    <g fill="currentColor">
      <rect x="10.4" y="3" width="3.2" height="11" rx="1.6" />
      <circle cx="12" cy="19" r="2" />
    </g>
  ),
  // GHS09 — environment / aquatic toxicity (dead fish over water)
  'Environmental hazard': (
    <g>
      <path d="M2.5 9.5c3-3.8 9-3.8 12 0-3 3.8-9 3.8-12 0z" fill="currentColor" />
      <path d="M14.5 9.5l5-3.2v6.4z" fill="currentColor" />
      <path d="M5.2 8.2l1.6 1.6M6.8 8.2L5.2 9.8" stroke="white" strokeWidth="1" strokeLinecap="round" />
      <path d="M2.5 16.5h19M2.5 19.5h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  // Lab handling notes (not official GHS)
  'Moisture sensitive': (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4c2.6 3.4 4.3 5.6 4.3 7.8a4.3 4.3 0 01-8.6 0C7.7 9.6 9.4 7.4 12 4z" />
      <line x1="5" y1="19" x2="19" y2="5" />
    </g>
  ),
  'Air sensitive': (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 8.5h10.5a2.4 2.4 0 10-2.4-2.4" />
      <path d="M3 13.5h14a2.7 2.7 0 11-2.7 2.7" />
      <path d="M3 18.5h8" />
    </g>
  ),
}

const SIZES = { sm: 20, md: 32 } as const

export function HazardDiamond({ label, size = 'sm' }: { label: string; size?: keyof typeof SIZES }) {
  const symbol = SYMBOLS[label]
  const px = SIZES[size]
  // Unknown / "None" labels: fall back to a small neutral chip so nothing breaks.
  if (!symbol) {
    return (
      <span
        title={label}
        className="inline-flex items-center justify-center rounded border border-slate-200 bg-slate-50 text-[9px] font-medium text-slate-500 px-1"
        style={{ height: px }}
      >
        {label}
      </span>
    )
  }
  return (
    <span
      title={label}
      className="relative inline-flex items-center justify-center align-middle"
      style={{ width: px, height: px }}
    >
      {/* Red diamond frame */}
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
        <path d="M24 2.5 45.5 24 24 45.5 2.5 24Z" fill="white" stroke="#dc2626" strokeWidth="4" strokeLinejoin="round" />
      </svg>
      {/* Upright black symbol, centered */}
      <svg viewBox="0 0 24 24" className="relative text-slate-900" style={{ width: '56%', height: '56%' }}>
        {symbol}
      </svg>
    </span>
  )
}

export default function HazardPictograms({ hazards, size = 'sm' }: { hazards: string; size?: keyof typeof SIZES }) {
  const labels = hazards
    .split(',')
    .map(h => h.trim())
    .filter(h => h && h.toLowerCase() !== 'none')
  if (labels.length === 0) return <span className="text-slate-400">—</span>
  return (
    <div className="flex flex-wrap items-center gap-1">
      {labels.map(label => (
        <HazardDiamond key={label} label={label} size={size} />
      ))}
    </div>
  )
}
