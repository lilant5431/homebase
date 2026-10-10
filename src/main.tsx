import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppearanceBoundary from './AppearanceBoundary'
import VisualEffectsLayer from './VisualEffectsLayer'
import { referenceFromDate } from './planner'
import { APP_CONFIG } from './config'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-500.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/dm-sans/latin-800.css'
import '@fontsource/manrope/latin-800.css'
import './styles.css'
import './styles/appearance.css'

// Capture once outside StrictMode rendering; only source edits or Refresh plan advance it.
const initialReference = referenceFromDate(new Date())
document.title = APP_CONFIG.name
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppearanceBoundary>
      <VisualEffectsLayer />
      <App initialReference={initialReference} />
    </AppearanceBoundary>
  </React.StrictMode>,
)
