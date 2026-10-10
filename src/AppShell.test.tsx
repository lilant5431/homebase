import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, StrictMode } from 'react'
import AppShell, { destinations } from './AppShell'
import AppearanceBoundary from './AppearanceBoundary'
import { clearAppearanceBootstrap, mockAppearanceBrowser } from './testFixtures/appearance'
import LightingButton from './LightingButton'

beforeEach(() => {
  localStorage.clear()
  clearAppearanceBootstrap()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  clearAppearanceBootstrap()
})
function shell() {
  const navigate = vi.fn(),
    create = vi.fn()
  render(
    <AppShell view="overview" today="2026-10-12" onNavigate={navigate} onCreateAssignment={create}>
      <h1>Overview</h1>
    </AppShell>,
  )
  return { navigate, create }
}
describe('single responsive navigation', () => {
  it.each(destinations)('uses the existing $key destination exactly once', (item) => {
    const { navigate } = shell()
    fireEvent.click(screen.getByRole('button', { name: item.label }))
    expect(navigate).toHaveBeenCalledExactlyOnceWith(item.key)
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
  })
  it('marks current destination and invokes its primary action once', () => {
    const { create } = shell()
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'New assignment' }))
    expect(create).toHaveBeenCalledTimes(1)
  })
  it('focuses current navigation, traps Tab, closes on Escape and restores focus', async () => {
    mockAppearanceBrowser() // wide-layout query is false
    const user = userEvent.setup()
    shell()
    const menu = screen.getByRole('button', { name: 'Open menu' })
    await user.click(menu)
    expect(screen.getByRole('dialog', { name: 'Workspace navigation' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Overview' }))
    const close = screen.getByRole('button', { name: 'Close menu' })
    close.focus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Classes' }))
    await user.keyboard('{Tab}')
    expect(document.activeElement).toBe(close)
    await user.keyboard('{Escape}')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(menu)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('outside dismissal closes navigation and removes background inertness', () => {
    mockAppearanceBrowser()
    shell()
    const menu = screen.getByRole('button', { name: 'Open menu' })
    fireEvent.click(menu)
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss navigation' }))
    expect(screen.getByRole('main')).not.toHaveAttribute('inert')
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })
  it('navigation closes the drawer without remounting content', () => {
    mockAppearanceBrowser()
    function Content() {
      const [draft, setDraft] = useState('')
      return <input aria-label="Draft" value={draft} onChange={(e) => setDraft(e.target.value)} />
    }
    render(
      <AppShell view="overview" today="2026-10-12" onNavigate={vi.fn()} onCreateAssignment={vi.fn()}>
        <Content />
      </AppShell>,
    )
    const input = screen.getByLabelText('Draft')
    fireEvent.change(input, { target: { value: 'keep me' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Classes' }))
    expect(screen.getByLabelText('Draft')).toBe(input)
    expect(input).toHaveValue('keep me')
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  })
  it('cleans up drawer listeners and background scroll lock under StrictMode', () => {
    const os = mockAppearanceBrowser()
    const remove = vi.spyOn(document, 'removeEventListener')
    const mounted = render(
      <StrictMode>
        <AppShell view="overview" today="2026-10-12" onNavigate={vi.fn()} onCreateAssignment={vi.fn()}>
          <h1>Overview</h1>
        </AppShell>
      </StrictMode>,
    )
    expect(os.listenerCount()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(document.body.style.overflow).toBe('hidden')
    mounted.unmount()
    expect(document.body.style.overflow).toBe('')
    expect(os.listenerCount()).toBe(0)
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
  })
  it('keeps compact navigation usable without matchMedia and cleans up resize fallback', () => {
    vi.stubGlobal('matchMedia', undefined)
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 844)
    const remove = vi.spyOn(window, 'removeEventListener')
    const mounted = render(
      <AppShell view="overview" today="2026-10-12" onNavigate={vi.fn()} onCreateAssignment={vi.fn()}>
        <h1>Overview</h1>
      </AppShell>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      vi.stubGlobal('innerWidth', 1440)
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Overview' })).toBe(document.activeElement)
    mounted.unmount()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })
  it('does not duplicate New assignment on the Assignments screen', () => {
    render(
      <AppShell view="assignments" today="2026-10-12" onNavigate={vi.fn()} onCreateAssignment={vi.fn()}>
        <button>New assignment</button>
      </AppShell>,
    )
    expect(screen.getAllByRole('button', { name: 'New assignment' })).toHaveLength(1)
  })
})
describe('native activation lighting', () => {
  function light(disabled = false) {
    mockAppearanceBrowser()
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }) as unknown as Animation)
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate })
    const action = vi.fn()
    const mounted = render(
      <AppearanceBoundary>
        <LightingButton disabled={disabled} onClick={action}>
          Act
        </LightingButton>
      </AppearanceBoundary>,
    )
    return { action, animate, cancel, mounted, button: screen.getByRole('button', { name: 'Act' }) }
  }
  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate
  })
  it('keyboard and pointer invoke exactly one original action per activation; repeat cancels prior cue', async () => {
    const { action, animate, cancel, button } = light()
    const user = userEvent.setup()
    await user.click(button)
    expect(action).toHaveBeenCalledTimes(1)
    button.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(action).toHaveBeenCalledTimes(3)
    expect(animate).toHaveBeenCalledTimes(3)
    expect(cancel).toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('disabled actions produce neither handler calls nor cues', () => {
    const { action, animate, button } = light(true)
    fireEvent.click(button)
    expect(action).not.toHaveBeenCalled()
    expect(animate).not.toHaveBeenCalled()
  })
  it('menu closure cancels its cue and unsupported blur produces no cue', () => {
    const { button, cancel, animate, mounted } = light()
    fireEvent.click(button)
    mounted.rerender(
      <AppearanceBoundary>
        <LightingButton cueScope={false}>Act</LightingButton>
      </AppearanceBoundary>,
    )
    expect(cancel).toHaveBeenCalled()
    mockAppearanceBrowser({ backdropFilter: false })
    fireEvent.click(screen.getByRole('button', { name: 'Act' }))
    expect(animate).toHaveBeenCalledTimes(1)
  })
  it('unmount cancels decoration', () => {
    const { button, cancel, mounted } = light()
    fireEvent.click(button)
    mounted.unmount()
    expect(cancel).toHaveBeenCalled()
  })
  it.each(['reducedMotion', 'reducedTransparency', 'forcedColors'] as const)(
    'live %s cancels motion without blocking the action',
    (key) => {
      const os = mockAppearanceBrowser()
      const cancel = vi.fn(),
        animate = vi.fn(() => ({ cancel }) as unknown as Animation)
      Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate })
      const action = vi.fn()
      render(
        <AppearanceBoundary>
          <LightingButton onClick={action}>Act</LightingButton>
        </AppearanceBoundary>,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Act' }))
      act(() => os.update(key, true))
      expect(cancel).toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'Act' }))
      expect(action).toHaveBeenCalledTimes(2)
      expect(animate).toHaveBeenCalledTimes(1)
    },
  )
})
