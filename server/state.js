import { isNetlify, loadCurrent } from './services/storageService.js'
import { refreshDerivedFields } from './services/normalizationService.js'
import { enrichTickets } from './services/ticketEnrichmentService.js'

let current = { tickets: [], fileName: null, uploadedAt: null, totalTickets: 0 }
let derivedDay = null
let initialized = false
let hydrationPromise = null

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

export async function hydrateCurrent({ force = isNetlify } = {}) {
  if (initialized && !force) return current
  if (!hydrationPromise) {
    hydrationPromise = loadCurrent()
      .then((loaded) => {
        current = loaded
        derivedDay = null
        initialized = true
        return current
      })
      .finally(() => { hydrationPromise = null })
  }
  return hydrationPromise
}

export function getCurrent() {
  const today = todayKey()
  if (derivedDay !== today) {
    current = { ...current, tickets: enrichTickets(current.tickets.map((ticket) => refreshDerivedFields(ticket))) }
    current.totalTickets = current.tickets.length
    derivedDay = today
  }
  return current
}

export function setCurrent(next) {
  current = { ...next, totalTickets: next.totalTickets ?? next.tickets.length }
  initialized = true
  derivedDay = todayKey()
}

export function clearCurrent() {
  current = { tickets: [], fileName: null, uploadedAt: null, totalTickets: 0 }
  initialized = true
  derivedDay = todayKey()
}
