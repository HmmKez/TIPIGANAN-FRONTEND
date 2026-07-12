import { useEffect, useState } from 'react'

// Laravel's throttle middleware sends a `Retry-After` (seconds) header on a
// 429 — CORS hides it from JS unless the backend explicitly exposes it (see
// config/cors.php). Falls back to a reasonable guess if it's ever missing
// (older browser/proxy stripping the header) rather than showing no wait at all.
export function getRetryAfterSeconds(err) {
  if (err?.response?.status !== 429) return 0
  const header = err.response.headers?.['retry-after']
  const seconds = parseInt(header, 10)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 30
}

// Ticks a "try again in Ns" countdown down to 0 once per second. Pass 0 to
// clear it. Whenever `seconds` is set to a new positive value from outside
// (a fresh 429), the countdown restarts from there.
export function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => { setRemaining(seconds) }, [seconds])

  useEffect(() => {
    if (remaining <= 0) return
    const id = setTimeout(() => setRemaining(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  return remaining
}
