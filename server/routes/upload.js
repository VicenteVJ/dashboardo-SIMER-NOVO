import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { processExcelBuffer } from '../services/excelService.js'
import { removeCurrent, saveCurrent } from '../services/storageService.js'
import { summarize } from '../services/filterService.js'
import { clearCurrent, setCurrent } from '../state.js'

const router = Router()

router.post('/current', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file) return response.status(400).json({ error: 'Selecione um arquivo .xlsx para enviar.' })
    const { imported, tickets } = processExcelBuffer(request.file.buffer)
    if (!tickets.length) return response.status(400).json({ error: 'A planilha não contém linhas de tickets válidas.' })
    const metadata = await saveCurrent(request.file.buffer, tickets, request.file.originalname, imported)
    setCurrent({ tickets, ...metadata })
    response.status(201).json({ message: 'Excel carregado com sucesso.', ...metadata, summary: summarize(tickets) })
  } catch (error) {
    next(error)
  }
})

router.delete('/current', async (_request, response, next) => {
  try {
    await removeCurrent()
    clearCurrent()
    response.json({ message: 'Excel atual e cache removidos.' })
  } catch (error) {
    next(error)
  }
})

export default router
