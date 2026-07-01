import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { processExcelBuffer } from '../services/excelService.js'
import { removeCurrent, saveCurrent } from '../services/storageService.js'
import { summarize } from '../services/filterService.js'
import { clearCurrent, setCurrent } from '../state.js'

const router = Router()

router.post('/current', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file) {
      const message = 'Nenhum arquivo Excel foi enviado.'
      return response.status(400).json({ success: false, message, error: message })
    }
    const { imported, tickets } = processExcelBuffer(request.file.buffer)
    if (!tickets.length) {
      const message = 'A planilha não contém linhas de tickets válidas.'
      return response.status(400).json({ success: false, message, error: message })
    }
    const metadata = await saveCurrent(request.file.buffer, tickets, request.file.originalname, imported)
    setCurrent({ tickets, ...metadata })
    response.status(201).json({
      success: true,
      message: 'Excel carregado com sucesso.',
      filename: metadata.fileName,
      ...metadata,
      summary: summarize(tickets)
    })
  } catch (error) {
    next(error)
  }
})

router.delete('/current', async (_request, response, next) => {
  try {
    await removeCurrent()
    clearCurrent()
    response.json({ success: true, message: 'Excel removido com sucesso.' })
  } catch (error) {
    next(error)
  }
})

export default router
