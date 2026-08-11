import { useEffect, useRef, useState } from 'react'

/**
 * A labelled "Actions" button that opens a menu of NAMED actions for one table
 * row.
 *
 * Replaces rows of bare icon buttons. An icon only announces itself through a
 * hover tooltip, which touch and keyboard users never see at all — and even
 * with a mouse, "user-lock" vs "box-open" vs "archive" is guesswork you have to
 * hover three times to resolve.
 *
 * Shared rather than copied per page: this markup, its positioning maths and
 * its dismiss handling were about to exist in four places, and the last helper
 * that got duplicated across pages (initials) was fixed in one copy and stayed
 * broken in the other two.
 *
 * items: array of
 *   { icon, label, onClick, danger?, disabled?, title?, divider? }
 * Falsy entries are ignored, so callers can write `cond && {...}` inline.
 */
export default function RowActions({ items = [], label = 'Actions', align = 'left' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  const visible = items.filter(Boolean)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    // Reposition rather than drift: the menu is position:fixed, so if the page
    // scrolls underneath it the menu would otherwise hang in mid-air away from
    // its own button.
    const onScrollOrResize = () => setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // ~44px per item plus padding, so the flip-above decision is based on
      // roughly the real height rather than a fixed guess.
      const estimated = Math.min(visible.length * 42 + 12, 340)
      const room = window.innerHeight - r.bottom
      const width = 216
      setPos({
        top: room < estimated ? Math.max(8, r.top - estimated) : r.bottom + 4,
        left: align === 'right'
          ? Math.max(8, r.right - width)
          : Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
      })
    }
    setOpen(v => !v)
  }

  if (visible.length === 0) return <span className="text-muted">—</span>

  return (
    <>
      <button ref={btnRef} type="button" className="row-actions-btn" onClick={toggle}
              aria-haspopup="menu" aria-expanded={open}>
        {label} <i className="fas fa-chevron-down caret"></i>
      </button>

      {open && pos && (
        <>
          {/* Full-screen catcher so a click anywhere else dismisses the menu,
              and so opening one row's menu closes another's. */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setOpen(false)}></div>
          {/* position:fixed anchored to the button's own rect — a menu placed
              inside a table cell gets clipped by it. */}
          <div className="row-actions-menu" style={{ top: pos.top, left: pos.left }} role="menu">
            {visible.map((item, i) =>
              item.divider ? (
                <div className="divider" key={`d${i}`}></div>
              ) : (
                <button key={item.label} type="button" role="menuitem"
                        className={item.danger ? 'danger' : undefined}
                        disabled={item.disabled}
                        title={item.title}
                        onClick={() => {
                          // Close first: otherwise the menu sits open behind
                          // whatever modal the action just opened.
                          setOpen(false)
                          item.onClick?.()
                        }}>
                  <i className={`fas ${item.icon}`}></i> {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </>
  )
}
