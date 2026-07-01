import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const storageDir = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.resolve(serverDir, 'storage')

const paths = {
  currentExcel: path.join(storageDir, 'current.xlsx'),
  currentJson: path.join(storageDir, 'current.json'),
  currentRawJson: path.join(storageDir, 'current.raw.json'),
  comparison: path.join(storageDir, 'comparison.json'),
  oldExcel: path.join(storageDir, 'old.xlsx'),
  newExcel: path.join(storageDir, 'new.xlsx')
}

async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(tempPath, data)
  await fs.rename(tempPath, filePath)
}

export async function ensureStorage() {
  await fs.mkdir(storageDir, { recursive: true })
}

export async function loadCurrent() {
  await ensureStorage()
  try {
    const parsed = JSON.parse(await fs.readFile(paths.currentJson, 'utf8'))
    if (Array.isArray(parsed)) return { tickets: parsed, fileName: 'current.xlsx', uploadedAt: null }
    return { tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [], fileName: parsed.fileName || 'current.xlsx', uploadedAt: parsed.uploadedAt || null }
  } catch (error) {
    if (error.code === 'ENOENT') return { tickets: [], fileName: null, uploadedAt: null }
    console.warn('Cache current.json inválido; iniciando sem dados:', error.message)
    return { tickets: [], fileName: null, uploadedAt: null }
  }
}

export async function saveCurrent(buffer, tickets, fileName, imported = null) {
  await ensureStorage()
  const uploadedAt = new Date().toISOString()
  await atomicWrite(paths.currentExcel, buffer)
  await atomicWrite(paths.currentJson, JSON.stringify({ pipelineVersion: 2, fileName, uploadedAt, tickets }, null, 2))
  if (imported) await atomicWrite(paths.currentRawJson, JSON.stringify({ fileName, sheetName: imported.sheetName, headers: imported.headers, rows: imported.rows }, null, 2))
  return { fileName, uploadedAt }
}

export async function removeCurrent() {
  await Promise.all([paths.currentExcel, paths.currentJson, paths.currentRawJson].map((file) => fs.rm(file, { force: true })))
}

export async function saveComparison(oldBuffer, newBuffer, comparison) {
  await ensureStorage()
  await Promise.all([
    atomicWrite(paths.oldExcel, oldBuffer),
    atomicWrite(paths.newExcel, newBuffer),
    atomicWrite(paths.comparison, JSON.stringify(comparison, null, 2))
  ])
}

export async function loadComparison() {
  try {
    return JSON.parse(await fs.readFile(paths.comparison, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
