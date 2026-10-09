import { GridPattern } from './LibraryEffects'
import type { EffectId } from '../settings'

// Original, deterministic SVG scene. Bounded geometry; no particles, RAF or random seed.
function Horizon() {
  return (
    <svg className="horizon" viewBox="0 0 1200 780" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="stars">
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            cx={35 + ((i * 137) % 1120)}
            cy={28 + ((i * 67) % 330)}
            r={i % 5 === 0 ? 1.3 : 0.8}
          />
        ))}
      </g>
      <path
        className="distant-roof"
        d="M0 470H100V457H145V466H295V448H350V467H515V455H580V470H720V450H776V468H925V458H960V470H1200V780H0Z"
      />
      <g className="runway-lights">
        {Array.from({ length: 36 }, (_, i) => (
          <circle
            key={i}
            cx={15 + i * 34}
            cy={475 + (i % 3) * 6}
            r={i % 7 === 0 ? 2.4 : 1.6}
            className={i % 7 === 0 ? 'warm-light' : ''}
          />
        ))}
      </g>
      <path className="horizon-line" d="M0 494H1200M80 550L540 490M1120 550L660 490" />
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
    </div>
  )
}
