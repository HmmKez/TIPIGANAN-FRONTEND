// The scan folder: a folder on the staff member's OWN computer (where ScanSnap
// saves its PDFs) that the Upload page reads through the browser.
//
// It replaces the server-side scan inbox (2026-11-19), which needed a network
// share between the scanning computer and the server. Here the browser asks
// once, "let TIPIGANAN see this folder?", and remembers the answer.
//
// Uses the File System Access API: Chrome and Edge on desktop. Firefox and
// Safari do not have it; the page then says so and staff choose a PDF by hand.
//
// Nothing is ever deleted. A scan that is filed moves into a "Filed" subfolder
// of the scan folder, and a discarded one into "Discarded", so a mistake can be
// undone by moving the file back.

import { useCallback, useEffect, useRef, useState } from 'react'
import { thesesApi } from '../api/admin'

export const FILED = 'Filed'
export const DISCARDED = 'Discarded'

/** A file changed this recently may still be being written by the scanner. */
const SETTLE_MS = 5000
/** How often to look again while the page is open and visible. */
const POLL_MS = 30000
/** At most this many scans are listed, newest first. */
const MAX_LISTED = 100
/** Above this, a file is not read just to count its pages. */
const COUNT_PAGES_UP_TO = 25 * 1024 * 1024

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ---- Remembering the chosen folder (per browser) -----------------------------
// A folder handle can only be stored in IndexedDB, not localStorage.

const DB = 'tipiganan-scan-folder'
const STORE = 'handles'
const KEY = 'folder'

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function savedFolder() {
  try {
    const d = await db()
    return await new Promise((resolve) => {
      const req = d.transaction(STORE).objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

async function saveFolder(handle) {
  try {
    const d = await db()
    await new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(handle, KEY)
      tx.oncomplete = resolve
      tx.onerror = resolve
    })
  } catch { /* not remembered; staff simply choose it again next time */ }
}

// ---- Reading the folder --------------------------------------------------------

// Fingerprints are cached for the session by name + size + time, so the
// 30-second check does not re-read every PDF.
const fingerprints = new Map()

async function sha256(file) {
  const key = `${file.name}|${file.size}|${file.lastModified}`
  if (fingerprints.has(key)) return fingerprints.get(key)
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
  fingerprints.set(key, hex)
  return hex
}

// The same cheap count the server used: page objects in the file. Good for
// ordinary PDFs; skipped for very large ones rather than read whole.
const pageCounts = new Map()
async function countPages(file) {
  if (file.size > COUNT_PAGES_UP_TO) return null
  const key = `${file.name}|${file.size}|${file.lastModified}`
  if (pageCounts.has(key)) return pageCounts.get(key)
  const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
  const n = (text.match(/\/Type\s*\/Page[^s]/g) || []).length || null
  pageCounts.set(key, n)
  return n
}

async function listScans(dir) {
  const files = []
  for await (const entry of dir.values()) {
    // The folder itself only: Filed/ and Discarded/ are where finished ones go.
    if (entry.kind === 'file' && /\.pdf$/i.test(entry.name)) {
      files.push(await entry.getFile())
    }
  }
  files.sort((a, b) => b.lastModified - a.lastModified)
  const total = files.length
  const now = Date.now()

  const scans = await Promise.all(files.slice(0, MAX_LISTED).map(async (f) => {
    const settled = now - f.lastModified >= SETTLE_MS
    return {
      name: f.name,
      size: f.size,
      scanned_at: new Date(f.lastModified).toISOString(),
      settled,
      pages: settled ? await countPages(f).catch(() => null) : null,
      checksum: settled ? await sha256(f).catch(() => null) : null,
      known: null,
    }
  }))

  // Which are already in the repository: one request, fingerprints only.
  const checksums = scans.map(s => s.checksum).filter(Boolean)
  if (checksums.length) {
    try {
      const { data } = await thesesApi.knownFiles(checksums)
      for (const s of scans) s.known = (s.checksum && data?.known?.[s.checksum]) || null
    } catch { /* unknown is safe: the upload itself still refuses a repeat */ }
  }

  return { scans, total }
}

/** "Thesis.pdf", or "Thesis (2).pdf" if that name is taken in `dir`. */
async function freeName(dir, name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 1; i < 1000; i++) {
    const candidate = i === 1 ? name : `${base} (${i})${ext}`
    try { await dir.getFileHandle(candidate) } catch { return candidate }
  }
  return `${base} (${Date.now()})${ext}`
}

/**
 * Move a scan into a subfolder (Filed / Discarded). Copy, then remove: that
 * works in every Chrome and Edge, and the original is only removed once the
 * copy is complete, so a failure leaves the scan where it was.
 */
async function moveInto(dir, name, subfolder) {
  const file = await (await dir.getFileHandle(name)).getFile()
  const sub = await dir.getDirectoryHandle(subfolder, { create: true })
  const target = await sub.getFileHandle(await freeName(sub, name), { create: true })
  const writable = await target.createWritable()
  await writable.write(file)
  await writable.close()
  await dir.removeEntry(name)
}

// ---- The hook the Upload page uses -----------------------------------------------

/**
 * state: 'unsupported' | 'loading' | 'none' (no folder chosen yet)
 *      | 'needs-permission' (chosen before; the browser wants a click to allow)
 *      | 'ready' | 'error'
 */
export function useScanFolder() {
  const [state, setState] = useState(isSupported() ? 'loading' : 'unsupported')
  const [folder, setFolder] = useState(null)
  const [scans, setScans] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const busy = useRef(false)

  const refresh = useCallback(async (dir = folder) => {
    if (!dir || busy.current) return
    busy.current = true
    try {
      const { scans: list, total: n } = await listScans(dir)
      setScans(list); setTotal(n); setState('ready'); setError('')
    } catch (e) {
      // The folder was moved, renamed or unplugged, or access was withdrawn.
      setState('error')
      setError(e?.name === 'NotFoundError'
        ? 'The scan folder can no longer be found. It may have been moved or renamed. Choose it again.'
        : 'The scan folder could not be read. Choose it again.')
    } finally { busy.current = false }
  }, [folder])

  const open = useCallback(async (dir, ask) => {
    const opts = { mode: 'readwrite' }
    let perm = await dir.queryPermission(opts)
    if (perm !== 'granted' && ask) perm = await dir.requestPermission(opts)
    setFolder(dir)
    if (perm === 'granted') await refresh(dir)
    else setState('needs-permission')
  }, [refresh])

  // On opening the page: reconnect to the folder chosen before, if any.
  useEffect(() => {
    if (!isSupported()) return
    let cancelled = false
    savedFolder().then(dir => {
      if (cancelled) return
      if (!dir) { setState('none'); return }
      open(dir, false).catch(() => setState('none'))
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Every 30 seconds while the page is visible, and on coming back to it.
  useEffect(() => {
    if (state !== 'ready') return
    const tick = () => { if (document.visibilityState === 'visible') refresh() }
    const id = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [state, refresh])

  /** "Choose scan folder" / "Change folder" (needs the click: a user gesture). */
  const choose = useCallback(async () => {
    try {
      const dir = await window.showDirectoryPicker({ id: 'tipiganan-scans', mode: 'readwrite' })
      await saveFolder(dir)
      await open(dir, true)
    } catch (e) {
      if (e?.name !== 'AbortError') { setState('error'); setError('That folder could not be opened. Try another.') }
    }
  }, [open])

  /** The browser asked again (it does after a restart); one click allows it. */
  const reconnect = useCallback(() => folder && open(folder, true).catch(() => setState('error')), [folder, open])

  /** The PDF itself, read fresh, for uploading or viewing. */
  const fileFor = useCallback(async (name) => (await folder.getFileHandle(name)).getFile(), [folder])

  const move = useCallback(async (name, subfolder) => {
    await moveInto(folder, name, subfolder)
    await refresh()
  }, [folder, refresh])

  return { state, folderName: folder?.name || '', scans, total, error, choose, reconnect, refresh: () => refresh(), fileFor, move }
}
