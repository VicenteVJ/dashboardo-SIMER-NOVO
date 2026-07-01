import * as XLSX from 'xlsx'

const DATE_ONLY_BR = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):?(\d{2})?(?::?(\d{2}))?)?/

function validDateParts(date, year, month, day, hour, minute, second) {
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day &&
    date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second
}

export function parseDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value)

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const date = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0))
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value !== 'string' || !value.trim()) return null
  const text = value.trim()
  let match = text.match(DATE_ONLY_BR)
  if (match) {
    let [, day, month, year, hour = '0', minute = '0', second = '0'] = match
    const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year)
    const date = new Date(fullYear, Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    return validDateParts(date, fullYear, Number(month), Number(day), Number(hour), Number(minute), Number(second)) ? date : null
  }

  match = text.match(DATE_ISO)
  if (match) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    return validDateParts(date, Number(year), Number(month), Number(day), Number(hour), Number(minute), Number(second)) ? date : null
  }

  return null
}

export function toIsoOrNull(value) {
  const date = parseDate(value)
  if (!date) return null
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function differenceInDays(value, now = new Date()) {
  const date = parseDate(value)
  if (!date) return 0
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000))
}
