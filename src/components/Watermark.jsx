import { currentUser } from '../api/auth'
import { WATERMARK_LOGO } from '../config/branding'

// The visible-in-browser watermark. This is the *frontend* layer — the
// server-side WatermarkService already baked identity into the PDF stream,
// so this is really just a UX cue and an additional deterrent against
// screenshots. It sits absolutely-positioned over the PDF canvas.

export default function Watermark({ thesisId }) {
  const user = currentUser()
  const stamp = user
    ? `${user.name} · ${user.email}`
    : 'TIPIGANAN · academic use only'

  // A grid of repeated, rotated marks so cropping one instance still leaves
  // others visible in any screenshot. Fewer/larger than a dense text grid —
  // the logo alone reads as the brand, so it doesn't need many repeats to
  // register; the identity stamp underneath is what's actually traceable.
  const rows = 3
  const cols = 2

  return (
    <div className="wm-layer" aria-hidden="true">
      <div className="wm-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="wm-cell">
            <div className="wm-mark">
              <img src={WATERMARK_LOGO} alt="" className="wm-logo" />
              <div className="wm-text">
                <span className="wm-sub">{stamp}</span>
                <br />
                <span className="wm-sub">
                  Thesis #{thesisId} · {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
