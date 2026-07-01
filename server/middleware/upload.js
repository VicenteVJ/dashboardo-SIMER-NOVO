import multer from 'multer'
import path from 'node:path'

function excelFileFilter(_request, file, callback) {
  const extension = path.extname(file.originalname || '').toLowerCase()
  if (extension !== '.xlsx') {
    const error = new Error('Envie um arquivo .xlsx válido.')
    error.status = 400
    callback(error)
    return
  }
  callback(null, true)
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 2 },
  fileFilter: excelFileFilter
})
