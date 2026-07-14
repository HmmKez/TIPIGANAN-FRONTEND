import { currentUser } from '../api/auth'

// The visible-in-browser watermark. This is the *frontend* layer — the
// server-side WatermarkService already baked the MDC seal into the PDF stream,
// so this layer carries only the thing the server cannot know at stamp time:
// WHO is looking at it, right now.
//
// It used to repeat a 96px seal in every cell as well. That was six more logos
// on top of the one the server already stamps — the brand was never in doubt,
// and they were the main thing crowding the page. The seal now lives in exactly
// one place (the server's centred stamp) and this layer is identity only.

export default function Watermark({ thesisId }) {
  const user = currentUser()
  const stamp = user
    ? `${user.name} · ${user.email}`
    : 'TIPIGANAN · academic use only'

  // Still repeated rather than shown once: cropping a screenshot to a single
  // paragraph must not be enough to cut the identity off it.
  const rows = 3
  const cols = 2

  return (
    <div className="wm-layer" aria-hidden="true">
      <div className="wm-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="wm-cell">
            <div className="wm-text">
              <span className="wm-sub">{stamp}</span>
              <br />
              <span className="wm-sub">
                Thesis #{thesisId} · {new Date().toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
