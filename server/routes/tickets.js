import { Router } from 'express'
import { filterTickets, summarize } from '../services/filterService.js'
import { getCurrent } from '../state.js'

const router = Router()

router.get('/', (request, response) => {
  const filtered = filterTickets(getCurrent().tickets, request.query)
  response.json({
    success: true,
    data: filtered,
    tickets: filtered,
    total: filtered.length,
    ...(!getCurrent().fileName ? { message: 'Nenhum Excel carregado no cache.' } : {})
  })
})

router.get('/summary', (request, response) => {
  response.json({ success: true, ...summarize(filterTickets(getCurrent().tickets, request.query)) })
})

router.get('/:numero', (request, response) => {
  const decoded = String(request.params.numero).trim().toLowerCase()
  const ticket = getCurrent().tickets.find((item) => String(item.numero).trim().toLowerCase() === decoded)
  if (!ticket) {
    const message = getCurrent().fileName
      ? `Ticket ${request.params.numero} não encontrado.`
      : 'Nenhum Excel carregado no cache.'
    return response.status(404).json({ success: false, message, error: message })
  }
  response.json(ticket)
})

export default router
