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
