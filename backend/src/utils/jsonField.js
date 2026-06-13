export function parseJsonField(row, fieldName) {
  if (!row) return null
  if (typeof row[fieldName] === 'string') {
    try {
      row[fieldName] = JSON.parse(row[fieldName])
    } catch {
      // keep original string
    }
  }
  return row
}
