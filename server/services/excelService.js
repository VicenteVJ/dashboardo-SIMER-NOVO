import * as XLSX from 'xlsx'
import { normalizeRows } from './normalizationService.js'
import { enrichTickets } from './ticketEnrichmentService.js'

export function importExcelBuffer(buffer) {
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  } catch {
    const error = new Error('Não foi possível ler o Excel. Verifique se o arquivo .xlsx é válido.')
    error.status = 400
    throw error
  }

  const firstSheet = workbook.SheetNames[0]
  if (!firstSheet) {
    const error = new Error('A planilha não possui nenhuma aba.')
    error.status = 400
    throw error
  }
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: true })
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  return { sheetName: firstSheet, headers, rows }
}

export function processExcelBuffer(buffer, now = new Date()) {
  const imported = importExcelBuffer(buffer)
  const normalized = normalizeRows(imported.rows, now)
  const tickets = enrichTickets(normalized, now)
  return { imported, normalized, tickets }
}

export function parseExcelBuffer(buffer, now = new Date()) {
  return processExcelBuffer(buffer, now).tickets
}
