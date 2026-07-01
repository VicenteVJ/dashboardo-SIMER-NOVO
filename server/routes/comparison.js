import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { compareTickets } from '../services/comparisonService.js'
import { parseExcelBuffer } from '../services/excelService.js'
import { saveComparison } from '../services/storageService.js'

const router = Router()
const fields = upload.fields([
  { name: 'oldFile', maxCount: 1 },
  { name: 'newFile', maxCount: 1 }
])

router.post('/', fields, async (request, response, next) => {
  try {
    const oldFile = request.files?.oldFile?.[0]
    const newFile = request.files?.newFile?.[0]
    if (!oldFile || !newFile) return response.status(400).json({ error: 'Selecione o Excel velho e o Excel novo.' })
    const oldTickets = parseExcelBuffer(oldFile.buffer)
    const newTickets = parseExcelBuffer(newFile.buffer)
    const comparison = compareTickets(oldTickets, newTickets)
    await saveComparison(oldFile.buffer, newFile.buffer, comparison)
    response.json(comparison)
  } catch (error) {
    next(error)
  }
})

export default router
