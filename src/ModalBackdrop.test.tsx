import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import ModalBackdrop from './ModalBackdrop'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.style.cssText = ''
})
function content(onClose = vi.fn()) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div role="dialog" tabIndex={-1}>
        <input aria-label="Title" />
        <button>Save</button>
      </div>
    </ModalBackdrop>
  )
}
it('focuses the dialog without opening a text keyboard and restores the page after closing', () => {
  document.body.style.padding = '7px'
  const opener = document.createElement('button')
  document.body.append(opener)
  opener.focus()
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(window, 'scrollY', 'get').mockReturnValueOnce(240).mockReturnValue(0)
  const view = render(content())
  expect(document.activeElement).toBe(screen.getByRole('dialog'))
  expect(document.activeElement).not.toBe(screen.getByLabelText('Title'))
  expect(document.body.style.position).toBe('fixed')
  expect(document.body.style.top).toBe('-240px')
  view.unmount()
  expect(document.body.style.position).toBe('')
  expect(document.body.style.padding).toBe('7px')
  expect(scroll).toHaveBeenCalledWith(0, 240)
  expect(document.activeElement).toBe(opener)
  opener.remove()
})
it('portals the mobile editor outside the background and preserves field state across layout changes', () => {
  const media = Object.assign(new EventTarget(), { matches: true })
  vi.stubGlobal('matchMedia', () => media)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const view = render(content())
  const field = screen.getByLabelText('Title')
  expect(view.container.contains(field)).toBe(false)
  expect(document.body.classList.contains('mobile-editor-open')).toBe(true)
  expect(document.body.style.position).toBe('')
  fireEvent.change(field, { target: { value: 'Retain my draft' } })
  field.focus()
  act(() => {
    media.matches = false
    media.dispatchEvent(new Event('change'))
  })
  expect(document.body.style.position).toBe('fixed')
  expect(document.body.classList.contains('mobile-editor-open')).toBe(false)
  act(() => {
    media.matches = true
    media.dispatchEvent(new Event('change'))
  })
  expect(document.body.style.position).toBe('')
  expect(screen.getByLabelText('Title')).toBe(field)
  expect((field as HTMLInputElement).value).toBe('Retain my draft')
  expect(document.activeElement).toBe(field)
  view.unmount()
  expect(document.body.classList.contains('mobile-editor-open')).toBe(false)
})
it('works without VisualViewport and dismisses only outside the form', () => {
  vi.stubGlobal('visualViewport', undefined)
  const close = vi.fn()
  render(content(close))
  fireEvent.mouseDown(screen.getByLabelText('Title'))
  expect(close).not.toHaveBeenCalled()
  fireEvent.mouseDown(document.querySelector('.modal-viewport')!)
  expect(close).toHaveBeenCalledTimes(1)
  fireEvent.mouseDown(document.querySelector('.modal-backdrop')!)
  expect(close).toHaveBeenCalledTimes(2)
})
it('leaves native field reveal and zoom alone even when viewport metrics arrive late', () => {
  const media = Object.assign(new EventTarget(), { matches: true })
  vi.stubGlobal('matchMedia', () => media)
  const viewport = Object.assign(new EventTarget(), { height: 390, offsetTop: 0, scale: 1 })
  vi.stubGlobal('visualViewport', viewport)
  const subscribe = vi.spyOn(viewport, 'addEventListener')
  const scrollPage = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const view = render(content())
  const field = screen.getByLabelText('Title')
  field.focus()
  scrollPage.mockClear()
  for (const scale of [1, 2]) {
    Object.assign(viewport, { height: 105, offsetTop: 70, scale })
    viewport.dispatchEvent(new Event('resize'))
    viewport.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('resize'))
  }
  expect(subscribe).not.toHaveBeenCalled()
  expect(scrollPage).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(field)
  expect(document.querySelector('.modal-viewport')?.hasAttribute('style')).toBe(false)
  expect(document.body.style.position).toBe('')
  view.unmount()
})
