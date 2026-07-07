import { currentUser } from '../api/auth'

// The visible-in-browser watermark. This is the *frontend* layer — the
// server-side WatermarkService already baked identity into the PDF stream,
// so this is really just a UX cue and an additional deterrent against
// screenshots. It sits absolutely-positioned over the PDF canvas.

export default function Watermark({ thesisId }) {
  const user = currentUser()
  const stamp = user
    ? `${user.name} · ${user.email}`
    : 'TIPIGANAN · academic use only'

  // A grid of repeated, rotated labels so cropping one instance still
  // leaves others visible in any screenshot.
  const rows = 6
  const cols = 3

  return (
    <div className="wm-layer" aria-hidden="true">
      <div className="wm-grid">
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="wm-cell">
            <div className="wm-text">
              MDC · TIPIGANAN
              <br />
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
