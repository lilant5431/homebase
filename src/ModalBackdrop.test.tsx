import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
it('responds to keyboard resize/pan but does not counteract pinch zoom and cleans up listeners', () => {
  const viewport = Object.assign(new EventTarget(), { height: 390, offsetTop: 0, scale: 1 })
  vi.stubGlobal('visualViewport', viewport)
  const remove = vi.spyOn(viewport, 'removeEventListener')
  const view = render(content())
  const frame = view.container.querySelector<HTMLElement>('.modal-viewport')!
  Object.assign(viewport, { height: 210, offsetTop: 45 })
  viewport.dispatchEvent(new Event('resize'))
  viewport.dispatchEvent(new Event('scroll'))
  expect(frame.style.height).toBe('210px')
  expect(frame.style.top).toBe('45px')
  Object.assign(viewport, { height: 105, offsetTop: 70, scale: 2 })
  viewport.dispatchEvent(new Event('resize'))
  expect(frame.style.height).toBe('210px')
  expect(frame.style.top).toBe('45px')
  view.unmount()
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
})
it('works without VisualViewport and dismisses only outside the form', () => {
  vi.stubGlobal('visualViewport', undefined)
  const close = vi.fn()
  const view = render(content(close))
  fireEvent.mouseDown(screen.getByLabelText('Title'))
  expect(close).not.toHaveBeenCalled()
  fireEvent.mouseDown(view.container.querySelector('.modal-viewport')!)
  expect(close).toHaveBeenCalledTimes(1)
  fireEvent.mouseDown(view.container.querySelector('.modal-backdrop')!)
  expect(close).toHaveBeenCalledTimes(2)
})
it('reveals the active field within the dialog after contraction or a focus switch without repeated scrolling', () => {
  const viewport = Object.assign(new EventTarget(), { height: 210, offsetTop: 45, scale: 1 })
  vi.stubGlobal('visualViewport', viewport)
  const frames: FrameRequestCallback[] = []
  const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame')
  const scrollPage = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const view = render(
    <ModalBackdrop onClose={() => {}}>
      <div role="dialog" tabIndex={-1}>
        <input aria-label="Lower field" />
        <input aria-label="Upper field" />
      </div>
    </ModalBackdrop>,
  )
  const dialog = screen.getByRole('dialog'),
    lower = screen.getByLabelText('Lower field'),
    upper = screen.getByLabelText('Upper field')
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 63, 500, 174))
  Object.defineProperty(dialog, 'clientHeight', { configurable: true, value: 174 })
  vi.spyOn(lower, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(10, 300 - dialog.scrollTop, 200, 44),
  )
  vi.spyOn(upper, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(10, 120 - dialog.scrollTop, 200, 44),
  )
  lower.focus({ preventScroll: true })
  viewport.dispatchEvent(new Event('resize'))
  viewport.dispatchEvent(new Event('scroll'))
  expect(request).toHaveBeenCalledTimes(1)
  frames[0](0)
  expect(lower.getBoundingClientRect().bottom).toBe(237)
  expect(document.activeElement).toBe(lower)
  viewport.dispatchEvent(new Event('resize'))
  viewport.dispatchEvent(new Event('scroll'))
  frames[1](0)
  expect(dialog.scrollTop).toBe(107)
  upper.focus({ preventScroll: true })
  frames[2](0)
  expect(upper.getBoundingClientRect().top).toBe(63)
  expect(document.activeElement).toBe(upper)
  expect(scrollPage).not.toHaveBeenCalled()
  viewport.dispatchEvent(new Event('resize'))
  const pending = frames.length
  view.unmount()
  expect(cancel).toHaveBeenCalledWith(pending)
})
