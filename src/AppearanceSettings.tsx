import { useAppearance } from './AppearanceBoundary'
import { appearanceChoices } from './appearance'

const names = {
  environment: 'Environment',
  mode: 'Palette',
  material: 'Content material',
  effects: 'Visual effects',
  motion: 'Motion',
}
const labels: Record<string, string> = {
  lattice: 'Lattice',
  landscape: 'Landscape',
  basic: 'Basic',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
  solid: 'Solid',
  frosted: 'Frosted',
  reduced: 'Reduced',
}
export default function AppearanceSettings() {
  const appearance = useAppearance()
  if (!appearance) return null
  const { selected, effective, change, reset, warning } = appearance
  return (
    <details className="appearance-settings">
      <summary>Appearance</summary>
      <div className="appearance-controls">
        <p>Presentation only. Atmospheric scenes arrive in a later milestone.</p>
        {Object.entries(appearanceChoices).map(([field, choices]) => {
          const key = field as keyof typeof appearanceChoices
          return (
            <div className="appearance-field" key={key}>
              <label htmlFor={`appearance-${key}`}>{names[key]}</label>
              <select
                id={`appearance-${key}`}
                value={selected[key]}
                onChange={(event) => change({ [key]: event.target.value })}
              >
                {choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {labels[choice]}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
        <p className="appearance-effective" role="status">
          Rendering {labels[effective.palette]} · {labels[effective.material]}.
          {selected.material !== effective.material &&
            ' Frosted is selected; accessibility preferences or browser support require Solid.'}
          {effective.reducedMotion && ' Motion reduced.'}
          {effective.reducedEffects && ' Visual effects reduced.'}
        </p>
        <button type="button" className="outline-button" onClick={reset}>
          Reset appearance
        </button>
        {warning && (
          <p className="appearance-warning" role="alert">
            {warning}
          </p>
        )}
      </div>
    </details>
  )
}
