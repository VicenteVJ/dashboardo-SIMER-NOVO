import path from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import comparisonRouter from './routes/comparison.js'
import exportRouter from './routes/export.js'
import ticketsRouter from './routes/tickets.js'
import uploadRouter from './routes/upload.js'
import { filterTickets, summarize } from './services/filterService.js'
import { getCurrent } from './state.js'

const app = express()
const configuredOrigins = String(process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(compression())
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true)
    const error = new Error('Origem não autorizada pelo CORS.')
    error.status = 403
    callback(error)
  }
}))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  const current = getCurrent()
  response.json({
    status: 'ok',
    hasCurrentFile: Boolean(current.fileName),
    fileName: current.fileName,
    uploadedAt: current.uploadedAt,
    ticketCount: current.tickets.length
  })
})
app.use('/api/upload', uploadRouter)
app.use('/api/tickets', ticketsRouter)
app.get('/api/summary', (request, response) => {
  response.json(summarize(filterTickets(getCurrent().tickets, request.query)))
})
app.use('/api/compare', comparisonRouter)
app.use('/api/export', exportRouter)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.resolve(currentDir, '../client/dist')
app.use(express.static(clientDist))
app.get(/^(?!\/api).*/, (_request, response, next) => {
  response.sendFile(path.join(clientDist, 'index.html'), (error) => error ? next() : undefined)
})

app.use((request, response) => response.status(404).json({ error: `Rota não encontrada: ${request.method} ${request.path}` }))

app.use((error, _request, response, _next) => {
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'O arquivo excede o limite de 25 MB.' : error.message
  if (status >= 500) console.error(error)
  response.status(status).json({ error: message || 'Erro interno do servidor.' })
})

export default app
