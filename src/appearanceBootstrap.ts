import { initializeAppearance } from './appearanceBrowser'

// Bundled as a synchronous head script by Vite, before CSS and the React module.
initializeAppearance(window, document.documentElement)
