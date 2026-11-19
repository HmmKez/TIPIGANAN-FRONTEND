import { useMemo, useState } from 'react'
import { categoryCode, categoryPath, collectionName } from '../utils/category'

/**
 * Items per collection, or per category, from /reports/by-department rows
 * ({ category_id, total, category: { code, name, main_category } }).
 *
 * Shared by the Admin Dashboard and Reports. With two levels, one bar per
 * category got crowded and never answered "how much is in Faculty Research?",
 * so the default view is one bar per collection; "By Category" shows the
 * category bars, all of them or one collection's.
 */
export default function ItemsByCollectionChart({ rows, loading, emptyText = 'No data yet.' }) {
  const [view, setView] = useState('collection') // 'collection' | 'category'
  const [only, setOnly] = useState('')           // collection name, in category view

  const collections = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const col = r.category?.main_category
      const key = col?.id ?? 0
      const entry = map.get(key) || { key, code: col?.code || '—', name: col?.name || 'No collection', total: 0 }
      entry.total += Number(r.total) || 0
      map.set(key, entry)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  const bars = view === 'collection'
    ? collections.map(c => ({ key: `c${c.key}`, label: c.code, title: `${c.name}: ${c.total}`, total: c.total }))
    : rows
        .filter(r => !only || collectionName(r.category) === only)
        .map(r => ({
          key: `k${r.category_id}`,
          label: categoryCode(r.category) || `#${r.category_id}`,
          title: `${categoryPath(r.category)}: ${r.total}`,
          total: Number(r.total) || 0,
        }))

  const max = Math.max(1, ...bars.map(b => b.total))

  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <div role="group" aria-label="Chart view" style={{ display: 'inline-flex', gap: 4 }}>
          {[['collection', 'By Collection'], ['category', 'By Category']].map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v}
                    className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        {view === 'category' && collections.length > 1 && (
          <select className="filter-select" value={only} onChange={e => setOnly(e.target.value)} aria-label="Collection">
            <option value="">All collections</option>
            {collections.map(c => <option key={c.key} value={c.name}>{c.name}</option>)}
          </select>
        )}
      </div>

      {bars.length === 0 && !loading && <div className="text-muted" style={{ padding: 20 }}>{emptyText}</div>}

      {/* Many categories scroll sideways rather than squeezing into slivers. */}
      {/* paddingTop: a scrolling box clips what pokes out of it, and each
          bar's number sits 22px above the bar. */}
      <div style={{ overflowX: 'auto', paddingTop: 22 }}>
        <div className="bar-chart" style={{ minWidth: bars.length * 46 }}>
          {bars.map(b => (
            <div className="bar-col" key={b.key}>
              <div className="bar" style={{ height: `${Math.max(6, (b.total / max) * 100)}%` }}>
                <span className="bar-value">{b.total}</span>
              </div>
              {/* The code, not the name: no bar is wide enough for a full
                  college name. The name is in the tooltip. */}
              <span className="bar-label" title={b.title}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {view === 'collection' && collections.length > 0 && (
        <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
          {collections.map(c => `${c.code} = ${c.name}`).join(' · ')}
        </div>
      )}
    </>
  )
}
