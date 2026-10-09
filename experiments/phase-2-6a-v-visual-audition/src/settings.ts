import { useEffect, useState } from 'react'

export const effects = [
  {
    id: 'lattice',
    name: 'Sunlit lattice',
    credit: 'Magic UI Grid Pattern + original sunlight',
    url: 'https://magicui.design/docs/components/grid-pattern',
    comparison: true,
    motion: true,
    description:
      'The loved architectural grid, with flowing sunlight reaching glass, navigation and controls.',
  },
  {
    id: 'horizon',
    name: 'Airport horizon',
    credit: 'Original bounded SVG + CSS',
    url: '',
    comparison: false,
    motion: true,
    description:
      'Visible runway geometry, a moving directional wash, cyan and amber reflections across the workspace.',
  },
  {
    id: 'glass',
    name: 'Reflective glass',
    credit: 'Magic UI Magic Card · gradient technique',
    url: 'https://magicui.design/docs/components/magic-card',
    comparison: true,
    motion: false,
    description: 'Pointer-reactive rim lighting and frosted navigation; content stays solid.',
  },
  {
    id: 'beam',
    name: 'Border Beam',
    credit: 'Magic UI · CSS motion adaptation',
    url: 'https://magicui.design/docs/components/border-beam',
    comparison: true,
    motion: true,
    description: 'A light traces the navigation edge without moving the interface.',
  },
  {
    id: 'shimmer',
    name: 'Shimmer Action',
    credit: 'Magic UI Shimmer Button · plain CSS adaptation',
    url: 'https://magicui.design/docs/components/shimmer-button',
    comparison: true,
    motion: true,
    description: 'An illuminated action rim, with an opaque readable button face.',
  },
  {
    id: 'baseline',
    name: 'Static CSS baseline',
    credit: 'Original CSS only',
    url: '',
    comparison: false,
    motion: false,
    description: 'Still gradients and solid materials: compare the value of additional effects.',
  },
] as const
export type EffectId = (typeof effects)[number]['id']
export type Theme = 'day' | 'night'
export type Preset = 'Calm' | 'Balanced' | 'Cinematic'
export const presets: Record<Preset, { intensity: number; speed: number }> = {
  Calm: { intensity: 35, speed: 0.45 },
  Balanced: { intensity: 65, speed: 0.75 },
  Cinematic: { intensity: 92, speed: 1.2 },
}

export function useMedia(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener?.('change', update)
    update()
    return () => media.removeEventListener?.('change', update)
  }, [query])
  return matches
}
