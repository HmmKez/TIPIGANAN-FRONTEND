// The one place a category's display text is decided.
//
// These used to be derived per-page, and each page derived them differently:
// ThesisDetail did `name.slice(0, 4).toUpperCase()`, BrowsePage did
// `name.split(/[\s—-]/)[0]`. Both were guesses, and both were wrong:
//
//   * a name that was already an acronym came back duplicated — the detail page
//     rendered "CAST — CAST";
//   * a full name came back as a stub — "INST — Institutional Publications";
//   * and the guess was NOT UNIQUE. CABM-B and CABM-H both truncated to "CABM",
//     Special Collections and Special Boholano Creations both to "SPEC", so two
//     distinct collections shared one identifier and one icon.
//
// A category now carries a real `code` from the database. Nothing here derives
// anything — it reads the authored value, and falls back to the name only when a
// record predates the code column.

/** The short label: "CAST", "CABM-B", "IP". */
export function categoryCode(category) {
  return category?.code || category?.name || ''
}

/** The full title: "Institutional Publications". */
export function categoryName(category) {
  return category?.name || 'Uncategorized'
}

/**
 * Code and name together, for places that show both — but WITHOUT the
 * "CAST — CAST" duplication when a category's code and name are the same word.
 */
export function categoryLabel(category) {
  const code = categoryCode(category)
  const name = categoryName(category)

  return code && code.toUpperCase() !== name.toUpperCase() ? `${code} — ${name}` : name
}

/** The collection a category belongs to ("Thesis"), when the API sent it. */
export function collectionName(category) {
  return category?.main_category?.name || ''
}

/** "Thesis › College of Education": collection, then category. */
export function categoryPath(category) {
  const col = collectionName(category)
  const name = categoryName(category)
  return col ? `${col} › ${name}` : name
}

/**
 * Report rows ({ category, total }) ordered by collection, then category, so
 * a chart's bars sit together under their collection.
 */
export function sortByCollection(rows) {
  return [...rows].sort((a, b) =>
    collectionName(a.category).localeCompare(collectionName(b.category)) ||
    categoryName(a.category).localeCompare(categoryName(b.category)))
}
