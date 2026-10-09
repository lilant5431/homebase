import { GridPattern } from './LibraryEffects'
import type { EffectId } from '../settings'

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
      {effect === 'landscape' && (
        <>
          <div className="landscape-wash" />
          <div className="landscape-mist" />
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
