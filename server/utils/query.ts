/** A validated query without its unset and empty values, ready for serviceFetch. */
export function compactQuery(query: Record<string, string | number | undefined>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(query).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '',
    ),
  )
}
