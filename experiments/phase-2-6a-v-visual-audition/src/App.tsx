import {
  ChevronDown,
  CirclePause,
  CirclePlay,
  Compass,
  Moon,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Telescope,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Atmosphere } from './components/Atmosphere'
import { Composition } from './components/Composition'
import { effects, presets, useMedia, type EffectId, type Preset, type Theme } from './settings'

export function App() {
  const [theme, setTheme] = useState<Theme>('night')
  const [effect, setEffect] = useState<EffectId>('horizon')
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
  const movable = selected.motion && !(effect === 'lattice' && candidate)
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
      data-effect={effect}
      data-candidate={candidate && selected.comparison}
      data-reduced-motion={reduceMotion}
      data-reduced-effects={reduceEffects}
      data-inactive={inactive}
      data-blur={blurSupported}
      style={
        {
          '--intensity': intensity / 100,
          '--motion-duration': `${18 / speed}s`,
          '--beam-duration': `${(candidate ? 6 : 10) / speed}s`,
          '--shimmer-duration': `${(candidate ? 3 : 6) / speed}s`,
          colorScheme: theme === 'night' ? 'dark' : 'light',
        } as CSSProperties
      }
    >
      <header className="lab-header">
        <a href="#preview" className="lab-brand">
          <Compass size={24} />
          <span>
            homebase<span>VISUAL AUDITION / 2.6A-V</span>
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
          <fieldset className="theme-picker">
            <legend>Appearance</legend>
            <button aria-pressed={theme === 'day'} onClick={() => setTheme('day')}>
              <Sun size={17} />
              Daylight
            </button>
            <button aria-pressed={theme === 'night'} onClick={() => setTheme('night')}>
              <Moon size={17} />
              Night Flight
            </button>
          </fieldset>
          <label className="control-label" htmlFor="effect">
            Live effect
          </label>
          <select
            id="effect"
            value={effect}
            onChange={(event) => {
              setEffect(event.target.value as EffectId)
              setCandidate(false)
            }}
          >
            {effects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
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
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={candidate && selected.comparison}
                  disabled={!selected.comparison}
                  onChange={(event) => setCandidate(event.target.checked)}
                />
                <span>
                  Library defaults
                  <small>
                    {selected.comparison
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
            <small>All adaptations and limitations are documented in the component audit.</small>
          </div>
        </aside>
        <div className="preview-column">
          <div className="preview-caption">
            <span>
              <span className="status-dot" />
              {theme === 'night' ? 'Night Flight' : 'Modern Daylight'}
              <span className="caption-separator">/</span>
              {selected.name}
            </span>
            <span>
              {reduceEffects
                ? 'Opaque fallback'
                : candidate && selected.comparison
                  ? 'Library defaults'
                  : 'Homebase tuning'}
            </span>
          </div>
          <div id="preview" className="preview-stage" ref={stage}>
            <Atmosphere effect={effect} candidate={candidate && selected.comparison} />
            <Composition
              effect={effect}
              candidate={candidate && selected.comparison}
              interactive={!inactive && !reduceMotion}
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
          <h2>Six effects. One clear workspace.</h2>
          <p>
            Four attributed MIT Magic UI adaptations and two original CSS/SVG scenes. No animation library,
            WebGL, accounts, tracking or browser storage. Pause and reduction settings apply to every effect.
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
