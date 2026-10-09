import { useId } from 'react'

// One original SVG geometry for both palettes. No images, particles or runtime clock.
export function Landscape() {
  const id = useId()
  return (
    <div className="landscape-scene">
      <svg viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1">
            <stop stopColor="var(--land-sky-top)" />
            <stop offset="1" stopColor="var(--land-sky-bottom)" />
          </linearGradient>
          <linearGradient id={`${id}-lake`} x2="0" y2="1">
            <stop stopColor="var(--land-water)" />
            <stop offset="1" stopColor="var(--land-sky-top)" />
          </linearGradient>
          <linearGradient id={`${id}-reflection`} x2="0" y2="1">
            <stop stopColor="var(--land-light)" stopOpacity=".45" />
            <stop offset="1" stopColor="var(--land-light)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path fill={`url(#${id}-sky)`} d="M0 0H1200V320H0Z" />
        <g className="landscape-stars" fill="var(--land-light)">
          {Array.from({ length: 20 }, (_, i) => (
            <circle
              key={i}
              cx={40 + ((i * 137) % 1120)}
              cy={15 + ((i * 31) % 105)}
              r={i % 6 === 0 ? 1.4 : 0.8}
            />
          ))}
        </g>
        <circle cx="735" cy="72" r="43" fill="var(--land-light)" opacity=".06" />
        <circle cx="735" cy="72" r="30" fill="var(--land-light)" opacity=".09" />
        <circle className="landscape-orb" cx="735" cy="72" r="21" fill="var(--land-light)" />
        <g className="landscape-clouds" fill="var(--land-cloud)">
          <path d="M50 71C90 44 133 51 160 61C194 47 234 58 255 74C210 86 106 88 50 71ZM792 99C838 63 879 73 909 81C952 59 1003 85 1030 102C948 112 855 116 792 99Z" />
        </g>
        <path
          fill="var(--land-mountain-far)"
          d="M0 169L98 107L181 145L314 74L427 146L534 110L617 151L736 92L842 145L951 75L1062 135L1140 105L1200 147V230H0Z"
        />
        <path
          fill="var(--land-mountain-mid)"
          d="M0 192L106 160L238 181L390 129L526 190L641 145L754 179L906 135L1031 188L1131 149L1200 172V244H0Z"
        />
        <path
          fill="var(--land-mountain-near)"
          d="M0 194C113 176 152 203 279 194C349 185 402 206 522 197C677 184 780 202 880 193C1023 170 1094 199 1200 182V221H0Z"
        />
        <path fill={`url(#${id}-lake)`} d="M0 215Q600 198 1200 215V320H0Z" />
        <g className="landscape-reflections" opacity=".18">
          <path
            fill="var(--land-mountain-mid)"
            d="M0 220L120 254L270 241L390 282L520 231L646 269L752 239L906 281L1050 246L1200 267V220Z"
          />
          <path fill={`url(#${id}-reflection)`} d="M720 215H750L815 320H645Z" />
        </g>
        <g className="landscape-ripples" fill="none" stroke="var(--land-light)" strokeWidth="1" opacity=".24">
          <path d="M685 235H785M665 252H809M705 270H765M630 296H820M150 251H270M943 276H1080" />
        </g>
      </svg>
      <div className="lake-light" />
      <span className="lighting-cue landscape-sky-cue" data-cue-target="sky" />
      <span className="lighting-cue water-cue" data-cue-target="water" />
    </div>
  )
}
