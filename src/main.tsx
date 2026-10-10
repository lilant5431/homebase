import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppearanceBoundary from './AppearanceBoundary'
import VisualEffectsLayer from './VisualEffectsLayer'
import { referenceFromDate } from './planner'
import { APP_CONFIG } from './config'
import './styles.css'
import './styles/appearance.css'
import './styles/typography.css'
import './styles/shell.css'

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
