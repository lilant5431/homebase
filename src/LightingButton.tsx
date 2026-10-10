import { useEffect, useRef, type ButtonHTMLAttributes } from 'react'
import { useAppearance } from './AppearanceBoundary'
import { browserCapabilities } from './appearanceBrowser'

/** Native click owns the action. This disposable local decoration carries no result semantics. */
export default function LightingButton({
  children,
  onClick,
  className = '',
  cueScope,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { cueScope?: boolean }) {
  const state = useAppearance()
  const appearance = state?.effective
  const light = useRef<HTMLSpanElement>(null)
  const animation = useRef<Animation | null>(null)
  useEffect(() => {
    animation.current?.cancel()
    return () => animation.current?.cancel()
  }, [
    cueScope,
    state?.selected,
    appearance?.palette,
    appearance?.environment,
    appearance?.reducedMotion,
    appearance?.reducedEffects,
    appearance?.forcedColors,
  ])
  return (
    <button
      {...props}
      className={`lighting-button ${className}`}
      onClick={(event) => {
        animation.current?.cancel()
        if (
          !appearance?.reducedMotion &&
          !appearance?.reducedEffects &&
          !appearance?.forcedColors &&
          browserCapabilities(window).backdropFilter
        )
          animation.current =
            light.current?.animate?.([{ opacity: 0 }, { opacity: 0.65, offset: 0.25 }, { opacity: 0 }], {
              duration: 180,
              easing: 'cubic-bezier(.2,0,0,1)',
            }) ?? null
        onClick?.(event)
      }}
    >
      {children}
      <span className="activation-light" ref={light} aria-hidden="true" />
    </button>
  )
}
