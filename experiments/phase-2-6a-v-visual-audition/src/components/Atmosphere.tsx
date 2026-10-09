import { GridPattern } from './LibraryEffects'
import type { EffectId } from '../settings'

// Original, deterministic SVG scene. Bounded geometry; no particles, RAF or random seed.
function Horizon() {
  return (
    <svg className="horizon" viewBox="0 0 1200 280" preserveAspectRatio="none" aria-hidden="true">
      <g className="stars">
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            cx={35 + ((i * 137) % 1120)}
            cy={16 + ((i * 47) % 130)}
            r={i % 5 === 0 ? 1.3 : 0.8}
          />
        ))}
      </g>
      <path
        className="distant-roof"
        d="M0 180H100V167H145V176H295V158H350V177H515V165H580V180H720V160H776V178H925V168H960V180H1200V280H0Z"
      />
      <g className="runway-lights">
        {Array.from({ length: 36 }, (_, i) => (
          <circle
            key={i}
            cx={15 + i * 34}
            cy={185 + (i % 3) * 4}
            r={i % 7 === 0 ? 3.2 : 2.3}
            className={i % 7 === 0 ? 'warm-light' : ''}
          />
        ))}
      </g>
      <path className="horizon-line" d="M0 198H1200M160 280L540 198M1040 280L660 198" />
      <g className="taxiway-lights">
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i}>
            <circle cx={530 - i * 38} cy={202 + i * 8} r={1.2 + i * 0.12} />
            <circle cx={670 + i * 38} cy={202 + i * 8} r={1.2 + i * 0.12} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function Atmosphere({ effect, candidate }: { effect: EffectId; candidate: boolean }) {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="ambient-wash" />
      <div className="reflection" />
      {effect === 'lattice' && (
        <>
          <GridPattern candidate={candidate} />
          {!candidate && (
            <>
              <div className="sun-ray ray-one" />
              <div className="sun-ray ray-two" />
              <div className="geometric-orbit" />
            </>
          )}
        </>
      )}
      {effect === 'horizon' && (
        <>
          <Horizon />
          <div className="sky-light" />
        </>
      )}
      {(effect === 'glass' || effect === 'beam' || effect === 'shimmer') && (
        <div className="material-light" />
      )}
      <div className="atmosphere-vignette" />
      <span className="lighting-cue scene-cue" data-cue-target="environment" />
    </div>
  )
}
