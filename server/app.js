import path from 'node:path'
import compression from 'compression'
import express from 'express'
import { corsMiddleware } from './middleware/cors.js'
import comparisonRouter from './routes/comparison.js'
import exportRouter from './routes/export.js'
import ticketsRouter from './routes/tickets.js'
import uploadRouter from './routes/upload.js'
import { filterTickets, summarize } from './services/filterService.js'
import { getCurrent, hydrateCurrent } from './state.js'

const app = express()
const apiRoots = ['/health', '/upload', '/tickets', '/summary', '/compare', '/export']

app.use((request, _response, next) => {
  const functionPrefix = '/.netlify/functions/api'
  const [pathname, ...queryParts] = request.url.split('?')
  let normalizedPath = pathname

  if (pathname === functionPrefix || pathname.startsWith(`${functionPrefix}/`)) {
    normalizedPath = pathname.slice(functionPrefix.length) || '/'
  }
  if (!normalizedPath.startsWith('/api') && apiRoots.some((root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`))) {
    normalizedPath = `/api${normalizedPath}`
  }
  if (normalizedPath !== pathname) request.url = `${normalizedPath}${queryParts.length ? `?${queryParts.join('?')}` : ''}`
  next()
})

app.use(corsMiddleware)
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use('/api', async (_request, _response, next) => {
  await hydrateCurrent()
  next()
})

app.get('/api/health', (_request, response) => {
  const current = getCurrent()
  response.json({
    success: true,
    status: 'ok',
    hasCurrentFile: Boolean(current.fileName),
    fileName: current.fileName,
    uploadedAt: current.uploadedAt,
    ticketCount: current.tickets.length,
    cache: {
      loaded: Boolean(current.fileName),
      filename: current.fileName,
      totalTickets: current.tickets.length,
      uploadedAt: current.uploadedAt
    }
  })
})
app.use('/api/upload', uploadRouter)
app.use('/api/tickets', ticketsRouter)
app.get('/api/summary', (request, response) => {
  response.json({ success: true, ...summarize(filterTickets(getCurrent().tickets, request.query)) })
})
app.use('/api/compare', comparisonRouter)
app.use('/api/export', exportRouter)

const workingDirName = path.basename(process.cwd()).toLowerCase()
const projectRoot = ['server', 'client'].includes(workingDirName) ? path.resolve(process.cwd(), '..') : process.cwd()
const clientDist = path.resolve(projectRoot, 'client/dist')
app.use(express.static(clientDist))
app.get(/^(?!\/api).*/, (_request, response, next) => {
  response.sendFile(path.join(clientDist, 'index.html'), (error) => error ? next() : undefined)
})

app.use((request, response) => {
  const message = `Rota não encontrada: ${request.method} ${request.path}`
  response.status(404).json({ success: false, message, error: message })
})

app.use((error, _request, response, _next) => {
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  const message = error.code === 'LIMIT_FILE_SIZE' ? 'O arquivo excede o limite de 25 MB.' : error.message
  if (status >= 500) console.error(error)
  const normalizedMessage = message || 'Erro interno do servidor.'
  response.status(status).json({
    success: false,
    message: normalizedMessage,
    error: normalizedMessage,
    ...(error.details ? { details: error.details } : {})
  })
})

export default app
