import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react'

/** Keep the shade on the layout viewport, but the form inside keyboard-visible space. */
export default function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const frame = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = frame.current
    const viewport = window.visualViewport
    const body = document.body
    const previousStyle = body.style.cssText
    const scrollX = window.scrollX,
      scrollY = window.scrollY
    const previousFocus = document.activeElement
    // A fixed body prevents background scrolling/panning from exposing an unshaded page.
    Object.assign(body.style, {
      position: 'fixed',
      top: `-${scrollY}px`,
      left: `-${scrollX}px`,
      width: '100%',
      overflow: 'hidden',
    })
    let pendingFrame: number | undefined
    function revealFocusedField() {
      pendingFrame = undefined
      if (!root || (viewport && viewport.scale !== 1)) return
      const field = document.activeElement
      if (
        !(field instanceof HTMLElement) ||
        !root.contains(field) ||
        !field.matches('input:not([type="radio"]):not([type="checkbox"]), textarea, select')
      )
        return
      const dialog = field.closest<HTMLElement>('[role="dialog"]')
      if (!dialog) return
      const bounds = field.getBoundingClientRect(),
        clip = dialog.getBoundingClientRect()
      // Scroll only the actual dialog, by the smallest amount needed. Native document
      // scrolling cannot reliably reveal a field inside our fixed, keyboard-sized frame.
      const top = Math.max(clip.top + dialog.clientTop, viewport?.offsetTop ?? 0)
      const bottom = Math.min(
        clip.top + dialog.clientTop + dialog.clientHeight,
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      )
      if (bottom <= top) return
      let delta = 0
      if (bounds.top < top || bounds.height > bottom - top) delta = bounds.top - top
      else if (bounds.bottom > bottom) delta = bounds.bottom - bottom
      if (delta !== 0) dialog.scrollTop += delta
    }
    function queueFocusedField() {
      // Coalesce focus/viewport events into one layout-aware correction. No timers,
      // smooth scrolling, input handlers or dialog-scroll feedback loop.
      if (pendingFrame === undefined) pendingFrame = window.requestAnimationFrame(revealFocusedField)
    }
    function resize() {
      // Do not reflow the dialog to counteract a user's pinch zoom.
      if (!root || !viewport || viewport.scale !== 1) return
      root.style.top = `${viewport.offsetTop}px`
      root.style.height = `${viewport.height}px`
      queueFocusedField()
    }
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    root?.addEventListener('focusin', queueFocusedField)
    if (!viewport) window.addEventListener('resize', queueFocusedField)
    const dialog = root?.querySelector<HTMLElement>('[role="dialog"]')
    // Locked-session dialogs already own their initial focus. Other forms focus the
    // dialog, rather than opening a text keyboard before the user chooses a field.
    const ownsFocus = root?.contains(previousFocus)
    if (!ownsFocus) dialog?.focus({ preventScroll: true })
    return () => {
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
      root?.removeEventListener('focusin', queueFocusedField)
      if (!viewport) window.removeEventListener('resize', queueFocusedField)
      if (pendingFrame !== undefined) window.cancelAnimationFrame(pendingFrame)
      body.style.cssText = previousStyle
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY)
      if (!ownsFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [])
  function dismiss(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }
  return (
    <div className="modal-backdrop" onMouseDown={dismiss}>
      <div className="modal-viewport" ref={frame} onMouseDown={dismiss}>
        {children}
      </div>
    </div>
  )
}
