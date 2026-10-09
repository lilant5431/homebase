// Minimal adaptations of Magic UI, copyright (c) Magic UI, MIT.
// Original source, pinned commit, hashes and full license: ../vendor (from project root).
// GridPattern preserves the SVG pattern construction; MagicCard uses its gradient-only
// pointer geometry. BorderBeam swaps Motion for CSS; Shimmer retains the nested layers
// and source keyframes. No claim that these are unmodified upstream components.
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'

export function GridPattern({ candidate }: { candidate: boolean }) {
  const id = useId()
  const size = candidate ? 40 : 64
  const squares = [
    [2, 1],
    [6, 3],
    [10, 2],
    [4, 6],
  ]
  return (
    <svg aria-hidden="true" className="grid-pattern" data-library="Magic UI GridPattern">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" x={-1} y={-1}>
          <path d={`M.5 ${size}V.5H${size}`} fill="none" strokeDasharray="0" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      <svg x={-1} y={-1} className="grid-squares">
        {squares.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            strokeWidth={0}
            width={size - 1}
            height={size - 1}
            x={x * size + 1}
            y={y * size + 1}
          />
        ))}
      </svg>
    </svg>
  )
}

export function BorderBeam({ candidate, supported }: { candidate: boolean; supported: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`beam-track ${supported ? 'beam-supported' : 'beam-fallback'}`}
      data-library="Magic UI BorderBeam"
      style={
        {
          '--beam-from': candidate ? '#ffaa40' : 'var(--ice)',
          '--beam-to': candidate ? '#9c40ff' : 'var(--warm)',
          '--beam-size': candidate ? '50px' : '80px',
        } as CSSProperties
      }
    >
      <div className="beam-light" />
    </div>
  )
}

export function ShimmerButton({
  children,
  candidate,
  onClick,
}: {
  children: ReactNode
  candidate: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`shimmer-button ${candidate ? 'candidate-shimmer' : ''}`}
      data-library="Magic UI ShimmerButton"
      onClick={onClick}
    >
      <span aria-hidden="true" className="spark-container">
        <span className="spark-slide">
          <span className="spark-spin" />
        </span>
      </span>
      <span aria-hidden="true" className="shimmer-highlight" />
      <span aria-hidden="true" className="shimmer-backdrop" />
      <span className="shimmer-label">{children}</span>
    </button>
  )
}

export function MagicGlass({ children, interactive }: { children: ReactNode; interactive: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null)
  useEffect(() => {
    const element = ref.current
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      element?.style.removeProperty('--pointer-x')
      element?.style.removeProperty('--pointer-y')
    }
  }, [interactive])
  return (
    <div
      ref={ref}
      className="magic-glass"
      data-library="Magic UI MagicCard gradient adaptation"
      onPointerMove={(event) => {
        if (!interactive || event.pointerType === 'touch' || frame.current !== null) return
        const element = event.currentTarget
        const rect = element.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        frame.current = requestAnimationFrame(() => {
          element.style.setProperty('--pointer-x', `${x}px`)
          element.style.setProperty('--pointer-y', `${y}px`)
          frame.current = null
        })
      }}
      onPointerLeave={() => {
        if (frame.current !== null) cancelAnimationFrame(frame.current)
        frame.current = null
        ref.current?.style.removeProperty('--pointer-x')
        ref.current?.style.removeProperty('--pointer-y')
      }}
    >
      <div aria-hidden="true" className="magic-gradient" />
      <div className="glass-inner">{children}</div>
    </div>
  )
}
