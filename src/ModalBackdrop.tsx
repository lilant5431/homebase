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
    function resize() {
      // Do not reflow the dialog to counteract a user's pinch zoom.
      if (!root || !viewport || viewport.scale !== 1) return
      root.style.top = `${viewport.offsetTop}px`
      root.style.height = `${viewport.height}px`
    }
    resize()
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', resize)
    const dialog = root?.querySelector<HTMLElement>('[role="dialog"]')
    // Locked-session dialogs already own their initial focus. Other forms focus the
    // dialog, rather than opening a text keyboard before the user chooses a field.
    const ownsFocus = root?.contains(previousFocus)
    if (!ownsFocus) dialog?.focus({ preventScroll: true })
    return () => {
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', resize)
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
