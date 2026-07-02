import fs from 'node:fs/promises'
import path from 'node:path'

const workingDirName = path.basename(process.cwd()).toLowerCase()
const projectRoot = ['server', 'client'].includes(workingDirName) ? path.resolve(process.cwd(), '..') : process.cwd()
const serverDir = path.join(projectRoot, 'server')
export const storageDir = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.resolve(serverDir, 'storage')

// STORAGE_DIR is an explicit filesystem override used by the local test suite too.
// NETLIFY_FUNCTION is set by the Lambda entry point before this module is loaded.
export const isNetlify = !process.env.STORAGE_DIR && Boolean(
  process.env.NETLIFY_FUNCTION ||
  process.env.NETLIFY ||
  process.env.NETLIFY_DEV ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
)
export const storageProvider = isNetlify ? 'netlify-blobs' : 'filesystem'

const STORE_NAME = process.env.NETLIFY_BLOBS_STORE || 'simer-dashboard-cache'
const keys = {
  currentExcel: 'current.xlsx',
  currentJson: 'current.json',
  currentRawJson: 'current.raw.json',
  currentMetadata: 'current-metadata.json',
  comparison: 'comparison.json',
  oldExcel: 'old.xlsx',
  newExcel: 'new.xlsx'
}

const paths = Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, path.join(storageDir, key)]))
let storePromise

async function getBlobStore() {
  if (!storePromise) {
    storePromise = import('@netlify/blobs').then(({ getStore }) => getStore(STORE_NAME))
  }
  return storePromise
}

function blobError(error) {
  const wrapped = new Error('Erro ao acessar o cache no Netlify Blobs.')
  wrapped.status = 503
  wrapped.details = error?.message || String(error)
  return wrapped
}

async function withBlobError(operation) {
  try {
    return await operation()
  } catch (error) {
    throw blobError(error)
  }
}

async function readBlob(key, type) {
  const store = await getBlobStore()
  try {
    return await store.get(key, { type, consistency: 'strong' })
  } catch (error) {
    // Netlify Dev's offline Blob server does not expose an uncached endpoint.
    if (String(error?.message).includes('uncachedEdgeURL')) return store.get(key, { type })
    throw error
  }
}

function asArrayBuffer(value) {
  return new Uint8Array(value).buffer
}

async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tempPath, data)
  await fs.rename(tempPath, filePath)
}

async function writeBinary(name, value) {
  if (isNetlify) {
    return withBlobError(async () => (await getBlobStore()).set(keys[name], asArrayBuffer(value)))
  }
  await ensureStorage()
  await atomicWrite(paths[name], value)
}

async function readBinary(name) {
  if (isNetlify) {
    return withBlobError(async () => {
      const value = await readBlob(keys[name], 'arrayBuffer')
      return value == null ? null : Buffer.from(value)
    })
  }
  try {
    return await fs.readFile(paths[name])
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function writeJson(name, value) {
  if (isNetlify) {
    return withBlobError(async () => (await getBlobStore()).setJSON(keys[name], value))
  }
  await ensureStorage()
  await atomicWrite(paths[name], JSON.stringify(value, null, 2))
}

async function readJson(name) {
  if (isNetlify) {
    return withBlobError(() => readBlob(keys[name], 'json'))
  }
  try {
    return JSON.parse(await fs.readFile(paths[name], 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function deleteEntries(names) {
  if (isNetlify) {
    return withBlobError(async () => {
      const store = await getBlobStore()
      await Promise.all(names.map((name) => store.delete(keys[name])))
    })
  }
  await Promise.all(names.map((name) => fs.rm(paths[name], { force: true })))
}

export async function ensureStorage() {
  if (!isNetlify) await fs.mkdir(storageDir, { recursive: true })
}

export async function saveCurrentExcel(buffer) {
  await writeBinary('currentExcel', buffer)
}

export async function getCurrentExcel() {
  return readBinary('currentExcel')
}

export async function saveCurrentJson(data) {
  await writeJson('currentJson', data)
}

export async function getCurrentJson() {
  return readJson('currentJson')
}

export async function saveCurrentRawJson(data) {
  await writeJson('currentRawJson', data)
}

export async function getCurrentRawJson() {
  return readJson('currentRawJson')
}

export async function saveCurrentMetadata(metadata) {
  await writeJson('currentMetadata', metadata)
}

export async function getCurrentMetadata() {
  return readJson('currentMetadata')
}

export async function deleteCurrentCache() {
  await deleteEntries(['currentExcel', 'currentJson', 'currentRawJson', 'currentMetadata'])
}

export async function saveComparisonJson(data) {
  await writeJson('comparison', data)
}

export async function getComparisonJson() {
  return readJson('comparison')
}

export async function saveCompareFiles(oldBuffer, newBuffer) {
  await Promise.all([writeBinary('oldExcel', oldBuffer), writeBinary('newExcel', newBuffer)])
}

export async function getCompareFiles() {
  const [oldFile, newFile] = await Promise.all([readBinary('oldExcel'), readBinary('newExcel')])
  return { oldFile, newFile }
}

export async function loadCurrent() {
  try {
    const [parsed, metadata] = await Promise.all([getCurrentJson(), getCurrentMetadata()])
    if (!parsed) return { tickets: [], fileName: null, uploadedAt: null, totalTickets: 0 }
    const tickets = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.tickets) ? parsed.tickets : [])
    const fileName = metadata?.filename || metadata?.fileName || parsed.fileName || 'current.xlsx'
    const uploadedAt = metadata?.uploadedAt || parsed.uploadedAt || null
    return { tickets, fileName, uploadedAt, totalTickets: metadata?.totalTickets ?? tickets.length }
  } catch (error) {
    if (isNetlify) throw error
    console.warn('Cache current.json inválido; iniciando sem dados:', error.message)
    return { tickets: [], fileName: null, uploadedAt: null, totalTickets: 0 }
  }
}

export async function saveCurrent(buffer, tickets, fileName, imported = null) {
  const uploadedAt = new Date().toISOString()
  const metadata = { filename: fileName, fileName, totalTickets: tickets.length, uploadedAt }
  const processed = { pipelineVersion: 2, fileName, uploadedAt, tickets }
  const raw = imported
    ? { fileName, sheetName: imported.sheetName, headers: imported.headers, rows: imported.rows }
    : null

  await Promise.all([
    saveCurrentExcel(buffer, fileName),
    saveCurrentJson(processed),
    saveCurrentMetadata(metadata),
    ...(raw ? [saveCurrentRawJson(raw)] : [])
  ])
  return { fileName, uploadedAt, totalTickets: tickets.length }
}

export const removeCurrent = deleteCurrentCache

export async function saveComparison(oldBuffer, newBuffer, comparison) {
  await Promise.all([saveCompareFiles(oldBuffer, newBuffer), saveComparisonJson(comparison)])
}

export const loadComparison = getComparisonJson
