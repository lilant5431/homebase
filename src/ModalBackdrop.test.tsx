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
