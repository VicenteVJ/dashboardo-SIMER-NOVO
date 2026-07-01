export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function safeText(value) {
  const text = String(value ?? '').trim()
  return text || '(vazio)'
}

export function csvEscape(value) {
  const text = value == null ? '' : String(value)
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
