import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Hover/focus details rendered above scroll containers and native modal dialogs. */
export function Tooltip({
  children,
  content,
  className = '',
  focusable = true,
}: {
  children: ReactNode
  content: ReactNode
  className?: string
  focusable?: boolean
}) {
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })

  function cancelTimer() {
    clearTimeout(timer.current)
  }
  function hide() {
    cancelTimer()
    setOpen(false)
  }
  function show() {
    cancelTimer()
    setOpen(true)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  useLayoutEffect(() => {
    if (!open || !popup.current || !trigger.current) return
    const element = popup.current
    // Popovers live in the browser top layer, including above an open <dialog>.
    if (typeof element.showPopover === 'function') element.showPopover()
    else element.removeAttribute('popover')
    const rect = trigger.current.getBoundingClientRect()
    const tip = element.getBoundingClientRect()
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth
    const viewportHeight = window.innerHeight
    const below = rect.bottom + 10
    setPosition({
      left: Math.max(
        12,
        Math.min(rect.left + rect.width / 2 - tip.width / 2, viewportWidth - tip.width - 12),
      ),
      top: Math.max(
        12,
        Math.min(
          below + tip.height <= viewportHeight - 12 ? below : rect.top - tip.height - 10,
          viewportHeight - tip.height - 12,
        ),
      ),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    function dismiss(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        clearTimeout(timer.current)
        setOpen(false)
      }
    }
    function onScroll() {
      clearTimeout(timer.current)
      setOpen(false)
    }
    document.addEventListener('keydown', dismiss, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', dismiss, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <span
      ref={trigger}
      className={`info-trigger ${className}`.trim()}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={open ? id : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === 'touch') return
        cancelTimer()
        timer.current = setTimeout(() => setOpen(true), 180)
      }}
      onPointerLeave={() => {
        cancelTimer()
        timer.current = setTimeout(() => setOpen(false), 120)
      }}
      onFocus={show}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide()
      }}
    >
      {!focusable && isValidElement<{ 'aria-describedby'?: string }>(children)
        ? cloneElement(children, {
            'aria-describedby': open
              ? [children.props['aria-describedby'], id].filter(Boolean).join(' ')
              : children.props['aria-describedby'],
          })
        : children}
      {open &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            popover="manual"
            className="info-tooltip"
            style={position}
            onPointerEnter={cancelTimer}
            onPointerLeave={hide}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  )
}
