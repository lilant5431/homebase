import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  CalendarClock,
  Menu,
  Plus,
  X,
} from 'lucide-react'
import { APP_CONFIG } from './config'
import AppearanceSettings from './AppearanceSettings'
import LightingButton from './LightingButton'
import { formatDate } from './domain'

export type View = 'overview' | 'week' | 'assignments' | 'assessments' | 'commitments' | 'classes'
export const destinations = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'week', label: 'Weekly Planner', icon: CalendarDays },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'assessments', label: 'Assessments', icon: GraduationCap },
  { key: 'commitments', label: 'Commitments', icon: CalendarClock },
  { key: 'classes', label: 'Classes', icon: BookOpen },
] as const
const wideQuery = '(min-width: 1200px) and (min-height: 501px)'
function layoutMedia() {
  try {
    return window.matchMedia?.(wideQuery)
  } catch {
    return undefined
  }
}
function isWide(media = layoutMedia()) {
  return media?.matches ?? (window.innerWidth >= 1200 && window.innerHeight >= 501)
}

export default function AppShell({
  view,
  onNavigate,
  onCreateAssignment,
  today,
  children,
}: {
  view: View
  onNavigate: (view: View) => void
  onCreateAssignment: () => void
  today: string
  children: ReactNode
}) {
  const [wide, setWide] = useState(isWide)
  const [open, setOpen] = useState(false)
  const rail = useRef<HTMLElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  const drawerOpen = open && !wide
  useLayoutEffect(() => {
    const media = layoutMedia()
    function update() {
      setWide(isWide(media))
    }
    update()
    if (media) media.addEventListener('change', update)
    else window.addEventListener('resize', update)
    return () => {
      media?.removeEventListener('change', update)
      if (!media) window.removeEventListener('resize', update)
    }
  }, [])
  useLayoutEffect(() => {
    if (!drawerOpen) {
      if (wasOpen.current) {
        wasOpen.current = false
        if (wide)
          rail.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true })
        else opener.current?.focus({ preventScroll: true })
      }
      return
    }
    wasOpen.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rail.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(
        rail.current?.querySelectorAll<HTMLElement>('button,summary,select,[tabindex="0"]') ?? [],
      ).filter(
        (node) => !node.closest('details:not([open]) .appearance-controls') && !node.hasAttribute('disabled'),
      )
      const first = controls[0],
        last = controls.at(-1)
      if (
        event.shiftKey &&
        (document.activeElement === first || !rail.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !rail.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', keys)
    return () => {
      document.removeEventListener('keydown', keys)
      document.body.style.overflow = previousOverflow
    }
  }, [drawerOpen, wide])
  // A resize to the permanent rail closes transient intent, never the academic screen.
  useLayoutEffect(() => {
    if (wide) setOpen(false)
  }, [wide])
  function navigate(next: View) {
    onNavigate(next)
    setOpen(false)
  }
  const title = destinations.find((item) => item.key === view)!.label
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <aside
        ref={rail}
        id="navigation-panel"
        className={`sidebar ${drawerOpen ? 'open' : ''}`}
        inert={!wide && !drawerOpen}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label={drawerOpen ? 'Workspace navigation' : undefined}
      >
        <div className="brand">
          <strong>{APP_CONFIG.name}</strong>
          <LightingButton
            className="drawer-close icon-button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </LightingButton>
        </div>
        <nav aria-label="Main navigation">
          {destinations.map((item) => (
            <LightingButton
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              cueScope={drawerOpen}
              aria-current={view === item.key ? 'page' : undefined}
              onClick={() => navigate(item.key)}
            >
              <item.icon size={18} strokeWidth={1.9} aria-hidden="true" />
              {item.label}
            </LightingButton>
          ))}
        </nav>
        <AppearanceSettings />
      </aside>
      {drawerOpen && (
        <button
          tabIndex={-1}
          className="mobile-scrim"
          aria-label="Dismiss navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <main id="workspace" tabIndex={-1} className="main-content" inert={drawerOpen}>
        <header className="topbar">
          <div className="shell-location">
            <button
              ref={opener}
              className="mobile-menu icon-button"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="navigation-panel"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">{title}</div>
          </div>
          <div className="topbar-right">
            <span className="today-pill">
              <CalendarDays size={15} aria-hidden="true" />
              {formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {view !== 'assignments' && (
              <LightingButton
                className={`top-add ${view !== 'overview' ? 'shell-secondary' : ''}`}
                onClick={onCreateAssignment}
              >
                <Plus size={17} aria-hidden="true" />
                <span>New assignment</span>
              </LightingButton>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
