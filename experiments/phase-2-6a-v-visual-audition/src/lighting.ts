import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'

const cueDuration = 900
const cueDelays: Record<string, number> = {
  environment: 0,
  sky: 0,
  water: 80,
  navigation: 100,
  active: 170,
  action: 230,
  control: 280,
}

// Only discrete user events use JS animation. Ambient positions are CSS-animated,
// inherited custom properties, never React state or a global requestAnimationFrame loop.
export function useLightingCue(stage: RefObject<HTMLDivElement | null>, enabled: boolean, scene: string) {
  const animations = useRef<Animation[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [active, setActive] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('Interactive visual preview · the records below are illustrative.')
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    animations.current.forEach((animation) => animation.cancel())
    animations.current = []
  }, [])
  // Cancel before the next paint when controls or visibility disable the cue.
  useLayoutEffect(() => {
    cancel()
    setActive(false)
    return cancel
  }, [cancel, enabled, scene])
  function play() {
    cancel()
    setConfirmed(true)
    setActive(false)
    setMessage('Light cue confirmed. This preview does not save or schedule work.')
    if (!enabled || !stage.current || typeof stage.current.animate !== 'function') return
    const targets = stage.current.querySelectorAll<HTMLElement>('[data-cue-target]')
    animations.current = Array.from(targets, (target) => {
      // Scene light pulses in place: translating a viewport-sized layer leaves
      // uncovered edges. Only local chrome highlights sweep within their clips.
      const sceneTarget = ['environment', 'sky', 'water'].includes(target.dataset.cueTarget || '')
      const keyframes: Keyframe[] = sceneTarget
        ? [{ opacity: 0 }, { opacity: 0.65, offset: 0.4 }, { opacity: 0 }]
        : [
            { opacity: 0, transform: 'translateX(-35%)' },
            { opacity: 0.85, offset: 0.4 },
            { opacity: 0, transform: 'translateX(30%)' },
          ]
      return target.animate(keyframes, {
        duration: cueDuration,
        delay: cueDelays[target.dataset.cueTarget || ''] || 0,
        easing: 'cubic-bezier(.2,.7,.3,1)',
        fill: 'none',
      })
    })
    setActive(true)
    timer.current = setTimeout(() => {
      cancel()
      setActive(false)
    }, cueDuration + 280)
  }
  return { play, active, confirmed, message }
}
