import { useAppearance } from './AppearanceBoundary'

/** Disposable decoration only. Scenes and interaction lighting are deferred to 2.6C/F. */
export default function VisualEffectsLayer() {
  const appearance = useAppearance()
  return (
    <div
      className="visual-effects-layer"
      aria-hidden="true"
      data-environment={appearance?.effective.environment}
    />
  )
}
