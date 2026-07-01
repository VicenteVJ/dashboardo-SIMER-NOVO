import { Router } from 'express'
import { filterTickets, summarize } from '../services/filterService.js'
import { getCurrent } from '../state.js'

const router = Router()

router.get('/', (request, response) => {
  const filtered = filterTickets(getCurrent().tickets, request.query)
  response.json({ tickets: filtered, total: filtered.length })
})

router.get('/summary', (request, response) => {
  response.json(summarize(filterTickets(getCurrent().tickets, request.query)))
})

router.get('/:numero', (request, response) => {
  const decoded = String(request.params.numero).trim().toLowerCase()
  const ticket = getCurrent().tickets.find((item) => String(item.numero).trim().toLowerCase() === decoded)
  if (!ticket) return response.status(404).json({ error: `Ticket ${request.params.numero} não encontrado.` })
  response.json(ticket)
})

export default router
