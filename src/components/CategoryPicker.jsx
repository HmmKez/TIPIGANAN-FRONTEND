import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Collection, then Category: two linked dropdowns for filing an item.
 *
 * `categories` is the /categories list, where each category carries its
 * `main_category`. Only collections that have categories are offered, because
 * an item can only be filed under a category. Renders two .form-group blocks,
 * for the caller to place inside a .form-row.
 *
 * `categories` is null while it is still loading. Once loaded and empty (a new
 * installation), a note says where collections and categories are created,
 * instead of leaving two empty dropdowns unexplained.
 */
const NONE = []

export default function CategoryPicker({ categories: loaded, value, onChange }) {
  const categories = loaded ?? NONE
  const collections = useMemo(() => {
    const seen = new Map()
    for (const c of categories) {
      const col = c.main_category
      if (col && !seen.has(col.id)) seen.set(col.id, col)
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const collectionOf = (categoryId) =>
    categories.find(c => String(c.id) === String(categoryId))?.main_category_id ?? ''

  const [collectionId, setCollectionId] = useState(() => collectionOf(value))

  // The item's category arrives after the lists load (Edit), or is cleared by
  // the caller (a reset form): keep the first dropdown in step with it.
  useEffect(() => {
    if (value) setCollectionId(collectionOf(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, categories])

  const inCollection = categories
    .filter(c => String(c.main_category_id) === String(collectionId))
    .sort((a, b) => a.name.localeCompare(b.name))

  const pickCollection = (id) => {
    setCollectionId(id)
    // The chosen category belongs to the old collection, so it no longer fits.
    if (value && String(collectionOf(value)) !== String(id)) onChange('')
  }

  return (
    <>
      <div className="form-group">
        <label className="form-label">Collection <span className="req">*</span></label>
        <select className="form-control" required
                value={collectionId} onChange={e => pickCollection(e.target.value)}>
          <option value="">— Select Collection —</option>
          {collections.map(col => (
            <option key={col.id} value={col.id}>{col.name}</option>
          ))}
        </select>
        {loaded && collections.length === 0 && (
          <small className="text-muted" style={{ fontSize: 11 }}>
            No categories yet. Create a collection and a category in{' '}
            <Link to="/admin/categories">Collections &amp; Categories</Link> first.
          </small>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Category <span className="req">*</span></label>
        <select className="form-control" required disabled={!collectionId}
                value={value} onChange={e => onChange(e.target.value)}>
          <option value="">{collectionId ? '— Select Category —' : 'Choose a collection first'}</option>
          {inCollection.map(c => (
            <option key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</option>
          ))}
        </select>
      </div>
    </>
  )
}
