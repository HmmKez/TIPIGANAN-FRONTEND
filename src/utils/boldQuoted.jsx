// Renders `text` as real React nodes, bolding the first "quoted" segment —
// e.g. `Bookmarked "Some Thesis Title"` -> Bookmarked <b>"Some Thesis Title"</b>.
// `text` is built from thesis titles and account names, neither of which is
// HTML-escaped server-side, so this must never go through
// dangerouslySetInnerHTML (that used to render user-controlled HTML/script
// straight into the page). Plain JSX text nodes are auto-escaped by React,
// so this gets the same visual effect with no injection risk.
export function boldQuoted(text) {
  const str = text || ''
  const match = /"([^"]+)"/.exec(str)
  if (!match) return str

  const start = match.index
  const end = start + match[0].length

  return (
    <>
      {str.slice(0, start)}
      <b>"{match[1]}"</b>
      {str.slice(end)}
    </>
  )
}
