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
    id: 'landscape',
    name: 'Atmospheric Landscape',
    credit: 'Original bounded SVG + CSS',
    url: '',
    comparison: false,
    motion: true,
    description:
      'An airy, full-page colored sketch: mountain contours, drawn clouds and lightly reflected water.',
  },
  {
    id: 'landscape-legacy',
    name: 'V3 Landscape band',
    credit: 'Original V3 SVG + CSS · archived comparison',
    url: '',
    comparison: false,
    motion: true,
    description:
      'The previous filled mountain/lake strip, retained in both palettes for comparison with the full-page sketch.',
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
    name: 'Basic',
    credit: 'Original CSS only',
    url: '',
    comparison: false,
    motion: false,
    description: 'Clear surfaces, considered spacing and reflective chrome without a cinematic background.',
  },
] as const
export type EffectId = (typeof effects)[number]['id']
export type Environment = 'lattice' | 'landscape' | 'basic'
export type AppearanceMode = 'system' | 'light' | 'dark'
export const contentMaterials = [
  { id: 'solid', name: 'Solid' },
  { id: 'frosted', name: 'Frosted' },
] as const
export type ContentMaterial = (typeof contentMaterials)[number]['id']
export const environments: { id: Environment; name: string; effect: EffectId }[] = [
  { id: 'lattice', name: 'Sunlit Lattice', effect: 'lattice' },
  { id: 'landscape', name: 'Atmospheric Landscape', effect: 'landscape' },
  { id: 'basic', name: 'Basic', effect: 'baseline' },
]
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
