import {
  ChevronDown,
  CirclePause,
  CirclePlay,
  Compass,
  Moon,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Telescope,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Atmosphere } from './components/Atmosphere'
import { Composition } from './components/Composition'
import { useLightingCue } from './lighting'
import {
  effects,
  environments,
  contentMaterials,
  type ContentMaterial,
  presets,
  useMedia,
  type EffectId,
  type Preset,
  type Environment,
  type AppearanceMode,
} from './settings'

export function App() {
  const [environment, setEnvironment] = useState<Environment>('lattice')
  const [material, setMaterial] = useState<ContentMaterial>('solid')
  const [mode, setMode] = useState<AppearanceMode>('system')
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const effectiveMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
  // Retain the tested palette CSS; environment and appearance are independent state.
  const theme = effectiveMode === 'dark' ? 'night' : 'day'
  const selectedEnvironment = environments.find((item) => item.id === environment)!
  const [archiveEffect, setArchiveEffect] = useState<EffectId | null>(null)
  const effect = archiveEffect ?? selectedEnvironment.effect
  const [intensity, setIntensity] = useState(65)
  const [speed, setSpeed] = useState(0.75)
  const [preset, setPreset] = useState<Preset | null>('Balanced')
  const [paused, setPaused] = useState(false)
  const [manualMotion, setManualMotion] = useState(false)
  const [manualEffects, setManualEffects] = useState(false)
  const [candidate, setCandidate] = useState(false)
  const [hidden, setHidden] = useState(() => document.hidden)
  const [visible, setVisible] = useState(true)
  const stage = useRef<HTMLDivElement>(null)
  const systemMotion = useMedia('(prefers-reduced-motion: reduce)')
  const systemEffects = useMedia('(prefers-reduced-transparency: reduce)')
  const forcedColors = useMedia('(forced-colors: active)')
  const wide = useMedia('(min-width: 1100px)')
  const [controlsOpen, setControlsOpen] = useState(wide)
  const selected = effects.find((item) => item.id === effect)!
  const reduceEffects = manualEffects || systemEffects || forcedColors
  const reduceMotion = manualMotion || systemMotion || reduceEffects
  const inactive = paused || hidden || !visible
  const beamSupported =
    typeof CSS !== 'undefined' &&
    CSS.supports('offset-path', 'rect(0 auto auto 0 round 12px)') &&
    (CSS.supports('mask-composite', 'exclude') || CSS.supports('-webkit-mask-composite', 'xor'))
  const blurSupported =
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
  const fieldSupported = typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function'
  const effectiveMaterial = reduceEffects || !blurSupported ? 'solid' : material
  const integrated = archiveEffect === null
  const appearanceName =
    environment === 'lattice' && effectiveMode === 'dark' ? 'Moonlit Lattice' : selectedEnvironment.name
  const coordinated = integrated || effect === 'landscape-legacy'
  const effectiveCandidate = candidate && !integrated && selected.comparison
  const cue = useLightingCue(stage, !inactive && !reduceMotion, `${theme}:${effect}:${effectiveCandidate}`)
  const movable =
    (integrated ? fieldSupported && environment !== 'basic' : selected.motion) &&
    !(effect === 'lattice' && effectiveCandidate)
  useEffect(() => {
    const listener = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', listener)
    return () => document.removeEventListener('visibilitychange', listener)
  }, [])
  useEffect(() => {
    if (!stage.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])
  function applyPreset(name: Preset) {
    setPreset(name)
    setIntensity(presets[name].intensity)
    setSpeed(presets[name].speed)
  }
  function reset() {
    applyPreset('Balanced')
    setPaused(false)
    setManualMotion(false)
    setManualEffects(false)
    setCandidate(false)
  }
  return (
    <div
      className="audition"
      data-theme={theme}
      data-environment={environment}
      data-mode={effectiveMode}
      data-preference={mode}
      data-effect={effect}
      data-content-material={material}
      data-effective-material={effectiveMaterial}
      data-integrated={integrated}
      data-coordinated={coordinated}
      data-cue-active={cue.active}
      data-candidate={effectiveCandidate}
      data-reduced-motion={reduceMotion}
      data-reduced-effects={reduceEffects}
      data-inactive={inactive}
      data-blur={blurSupported}
      style={
        {
          '--intensity': intensity / 100,
          '--motion-duration': `${18 / speed}s`,
          '--beam-duration': `${(effectiveCandidate ? 6 : 10) / speed}s`,
          '--shimmer-duration': `${(effectiveCandidate ? 3 : 6) / speed}s`,
          colorScheme: theme === 'night' ? 'dark' : 'light',
        } as CSSProperties
      }
    >
      <header className="lab-header">
        <a href="#preview" className="lab-brand">
          <Compass size={24} />
          <span>
            homebase<span>VISUAL AUDITION / 2.6A-V6</span>
          </span>
        </a>
        <div className="lab-tag">An experiment in light & space</div>
        <a className="header-link" href="#method">
          About this experiment
          <ChevronDown size={16} />
        </a>
      </header>
      <div className="lab-layout">
        <aside className="lab-controls" aria-label="Visual controls">
          <div className="lab-heading">
            <span className="eyebrow">THE MATERIAL LAB</span>
            <h1>Find your atmosphere.</h1>
            <p>Experience the light. Keep the clarity.</p>
          </div>
          <div className="environment-picker">
            <label className="control-label" htmlFor="environment">
              Environment
            </label>
            <select
              id="environment"
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value as Environment)
                setArchiveEffect(null)
              }}
            >
              {environments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id === 'landscape' ? 'Landscape' : item.id === 'lattice' ? 'Lattice' : item.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="theme-picker palette-picker">
            <legend>Palette</legend>
            {(['system', 'light', 'dark'] as const).map((value) => {
              const Icon = value === 'system' ? Monitor : value === 'light' ? Sun : Moon
              return (
                <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
                  <Icon size={16} />
                  {value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark'}
                </button>
              )
            })}
            <p className="palette-status">
              {mode === 'system' ? 'Following device appearance' : 'Explicit palette'} ·{' '}
              {effectiveMode === 'light' ? 'Light' : 'Dark'}
            </p>
          </fieldset>
          <div className="material-picker">
            <label className="control-label" htmlFor="content-material">
              Content material
            </label>
            <select
              id="content-material"
              value={material}
              onChange={(event) => setMaterial(event.target.value as ContentMaterial)}
            >
              {contentMaterials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="control-help" role="status">
              {effectiveMaterial !== material
                ? 'Opaque panels required by reduced effects or unavailable backdrop blur. Your selection is retained.'
                : material === 'frosted'
                  ? 'Translucent panels with bounded blur and stronger text contrast.'
                  : 'Original opaque panels. No scenery shows through records.'}
            </p>
          </div>
          <div className="scene-label">
            <span className="eyebrow">
              {integrated ? 'COORDINATED ENVIRONMENT' : 'ARCHIVAL COMPARISON · NOT SHORTLISTED'}
            </span>
            <h2>
              {integrated
                ? `${appearanceName} — ${effectiveMode === 'light' ? 'Light' : 'Dark'}`
                : selected.name}
            </h2>
          </div>
          <p className="effect-description">{selected.description}</p>
          <fieldset className="presets">
            <legend>Intensity presets</legend>
            {(Object.keys(presets) as Preset[]).map((name) => (
              <button key={name} aria-pressed={preset === name} onClick={() => applyPreset(name)}>
                {name}
              </button>
            ))}
          </fieldset>
          <div className="transport">
            <button
              className="secondary-action"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <CirclePlay size={18} /> : <CirclePause size={18} />}
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="icon-button" aria-label="Reset recommended values" onClick={reset}>
              <RotateCcw size={18} />
            </button>
          </div>
          <details open={controlsOpen} onToggle={(event) => setControlsOpen(event.currentTarget.open)}>
            <summary>
              <SlidersHorizontal size={17} />
              Fine-tune & accessibility
              <ChevronDown size={16} />
            </summary>
            <div className="fine-tuning">
              <label htmlFor="intensity">
                Visual intensity<output>{intensity}%</output>
              </label>
              <input
                id="intensity"
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(event) => {
                  setIntensity(Number(event.target.value))
                  setPreset(null)
                }}
              />
              <label htmlFor="speed">
                Animation speed<output>{speed.toFixed(2)}×</output>
              </label>
              <input
                id="speed"
                type="range"
                min="0.25"
                max="1.5"
                step="0.05"
                value={speed}
                disabled={!movable || reduceMotion}
                onChange={(event) => {
                  setSpeed(Number(event.target.value))
                  setPreset(null)
                }}
              />
              <p className="control-help">
                {reduceMotion
                  ? 'Motion is stopped by reduced settings.'
                  : movable
                    ? 'Changes the selected effect’s CSS animation duration.'
                    : 'This candidate is static or responds directly to your pointer.'}
              </p>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={manualMotion || systemMotion}
                  disabled={systemMotion}
                  onChange={(event) => setManualMotion(event.target.checked)}
                />
                <span>Reduce motion{systemMotion && <small>Requested by your device</small>}</span>
              </label>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={reduceEffects}
                  disabled={systemEffects || forcedColors}
                  onChange={(event) => setManualEffects(event.target.checked)}
                />
                <span>
                  Reduce visual effects
                  {(systemEffects || forcedColors) && <small>Requested by your device</small>}
                </span>
              </label>
            </div>
          </details>
          <details className="technical-references">
            <summary>
              Sources & archived comparisons
              <ChevronDown size={16} />
            </summary>
            <div className="technical-body">
              <p className="control-help">
                Compare the older V3 Landscape band, or inspect archived library techniques.
              </p>
              <label className="control-label" htmlFor="effect">
                Technical comparison
              </label>
              <select
                id="effect"
                value={archiveEffect ?? 'integrated'}
                onChange={(event) =>
                  setArchiveEffect(
                    event.target.value === 'integrated' ? null : (event.target.value as EffectId),
                  )
                }
              >
                <option value="integrated">Return to integrated themes</option>
                {effects
                  .filter((item) => item.comparison || item.id === 'landscape-legacy')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {`Archive · ${item.name}`}
                    </option>
                  ))}
              </select>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={candidate && !integrated && selected.comparison}
                  disabled={integrated || !selected.comparison}
                  onChange={(event) => setCandidate(event.target.checked)}
                />
                <span>
                  Library defaults
                  <small>
                    {!integrated && selected.comparison
                      ? 'Compare untuned values with Homebase tuning'
                      : 'Original effect; no library counterpart'}
                  </small>
                </span>
              </label>
            </div>
          </details>
          <div className="provenance">
            <span className="eyebrow">SOURCE NOTES</span>
            {selected.url ? (
              <a href={selected.url} target="_blank" rel="noreferrer">
                {selected.credit} ↗
              </a>
            ) : (
              <p>{selected.credit}</p>
            )}
            <small>
              Shared glass: Magic UI Magic Card gradient technique. Full MIT attribution and source hashes are
              retained.
            </small>
          </div>
        </aside>
        <div className="preview-column">
          <div className="preview-caption">
            <span>
              <span className="status-dot" />
              {effectiveMode === 'dark' ? 'Dark palette' : 'Light palette'}
              <span className="caption-separator">/</span>
              {integrated ? appearanceName : selected.name}
            </span>
            <span>
              {reduceEffects
                ? 'Opaque fallback'
                : effectiveCandidate
                  ? 'Library defaults'
                  : integrated
                    ? 'Coordinated light + shared glass'
                    : 'Archival tuning'}
            </span>
          </div>
          <div
            id="preview"
            className="preview-stage"
            ref={stage}
            data-light-motion={
              fieldSupported && !reduceMotion && !effectiveCandidate && coordinated && effect !== 'baseline'
            }
          >
            <Atmosphere effect={effect} candidate={effectiveCandidate} />
            <div className="scene-cue-field" aria-hidden="true">
              <span className="lighting-cue scene-cue" data-cue-target="environment" />
            </div>
            <Composition
              effect={effect}
              candidate={effectiveCandidate}
              interactive={!inactive && !reduceMotion && (coordinated || effect === 'glass')}
              cueMessage={cue.message}
              cueConfirmed={cue.confirmed}
              playCue={cue.play}
              beamSupported={beamSupported}
            />
          </div>
          <div className="preview-notes">
            <Telescope size={18} />
            <p>
              <strong>Judge the atmosphere around the work.</strong> Switch to Weekly Planner, inspect a
              record, and try the light cue. These are illustrative compositions, not the Homebase
              application.
            </p>
          </div>
          <div className="fallback-notes" role="status">
            {integrated &&
              !fieldSupported &&
              'Animated light positions unsupported: static coordinated reflections. '}
            {!blurSupported && 'Backdrop blur unavailable: opaque navigation fallback. '}
            {effect === 'beam' && !beamSupported && 'Motion path unsupported: static illuminated border. '}
            {reduceMotion && 'Nonessential movement stopped. '}
            {paused && 'Effects paused. '}
          </div>
        </div>
      </div>
      <footer id="method" className="lab-footer">
        <div>
          <span className="eyebrow">LIGHT, WITHOUT THE WEIGHT</span>
          <h2>Three environments. Six appearances.</h2>
          <p>
            Lattice, atmospheric landscape and Basic share attributed Magic UI gradient reflections. Rejected
            candidates are archival references. No animation library, WebGL, accounts, tracking or browser
            storage. Pause and reduction settings apply to every effect.
          </p>
        </div>
        <div>
          <h3>What to look for</h3>
          <p>
            Compare Calm, Balanced and Cinematic. Does the light help the space feel inviting? Are the words
            still effortless to read? Phone performance and native Safari behavior require physical-device
            feedback.
          </p>
          <a href="https://github.com/lilant5431/homebase" target="_blank" rel="noreferrer">
            Research, source & testing notes ↗
          </a>
        </div>
      </footer>
    </div>
  )
}
