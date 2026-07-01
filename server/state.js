import { loadCurrent } from './services/storageService.js'
import { refreshDerivedFields } from './services/normalizationService.js'
import { enrichTickets } from './services/ticketEnrichmentService.js'

let current = await loadCurrent()
let derivedDay = null

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

export function getCurrent() {
  const today = todayKey()
  if (derivedDay !== today) {
    current = { ...current, tickets: enrichTickets(current.tickets.map((ticket) => refreshDerivedFields(ticket))) }
    derivedDay = today
  }
  return current
}

export function setCurrent(next) {
  current = next
  derivedDay = todayKey()
}

export function clearCurrent() {
  current = { tickets: [], fileName: null, uploadedAt: null }
  derivedDay = todayKey()
}
