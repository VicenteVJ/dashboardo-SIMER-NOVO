import { Router } from 'express'
import { comparisonToCsv, ticketsToCsv } from '../services/csvService.js'
import { filterTickets } from '../services/filterService.js'
import { loadComparison } from '../services/storageService.js'
import { getCurrent } from '../state.js'

const router = Router()

function sendCsv(response, fileName, contents) {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8')
  response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  response.send(contents)
}

router.get('/filtered', (request, response) => {
  const tickets = filterTickets(getCurrent().tickets, request.query)
  sendCsv(response, 'tickets-filtrados.csv', ticketsToCsv(tickets))
})

router.get('/comparison', async (_request, response, next) => {
  try {
    const comparison = await loadComparison()
    if (!comparison) return response.status(404).json({ error: 'Faça uma comparação antes de exportar.' })
    sendCsv(response, 'comparacao-tickets.csv', comparisonToCsv(comparison))
  } catch (error) {
    next(error)
  }
})

export default router
