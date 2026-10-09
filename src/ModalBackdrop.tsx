import { useLayoutEffect, useRef, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

/** Mobile forms use native document scrolling; desktop dialogs retain a fixed overlay. */
export default function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const frame = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = frame.current
    const body = document.body
    const previousStyle = body.style.cssText
    const hadMobileClass = body.classList.contains('mobile-editor-open')
    const scrollX = window.scrollX,
      scrollY = window.scrollY
    const previousFocus = document.activeElement
    // Use the same native scrolling mode in phone portrait and landscape. Moving the
    // editor outside #root lets CSS hide the background without unmounting application state.
    const mobile = window.matchMedia?.('(max-width: 950px)')
    function applyMode() {
      body.style.cssText = previousStyle
      body.classList.toggle('mobile-editor-open', mobile?.matches ?? false)
      if (mobile?.matches) {
        window.scrollTo(0, 0)
      } else {
        Object.assign(body.style, {
          position: 'fixed',
          top: `-${scrollY}px`,
          left: `-${scrollX}px`,
          width: '100%',
          overflow: 'hidden',
        })
      }
    }
    applyMode()
    mobile?.addEventListener('change', applyMode)
    // Focus the form, not a text input. Specialized dialogs may choose their initial
    // field afterwards. Native focus scrolling owns field reveal; no viewport handlers.
    const ownsFocus = root?.contains(previousFocus)
    if (!ownsFocus) root?.querySelector<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true })
    return () => {
      mobile?.removeEventListener('change', applyMode)
      body.classList.toggle('mobile-editor-open', hadMobileClass)
      body.style.cssText = previousStyle
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo(scrollX, scrollY)
      if (!ownsFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true })
    }
  }, [])
  function dismiss(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }
  return createPortal(
    <div className="modal-backdrop" onMouseDown={dismiss}>
      <div className="modal-viewport" ref={frame} onMouseDown={dismiss}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
