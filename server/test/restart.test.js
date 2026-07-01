import assert from 'node:assert/strict'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function freePort() {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

async function startServer(port, storageDir) {
  const child = spawn(process.execPath, ['index.js'], {
    cwd: serverRoot,
    env: { ...process.env, PORT: String(port), STORAGE_DIR: storageDir },
    stdio: ['ignore', 'pipe', 'pipe']
  })
  await Promise.race([
    new Promise((resolve, reject) => {
      child.stdout.on('data', (chunk) => chunk.toString().includes('API Simer') && resolve())
      child.stderr.on('data', (chunk) => reject(new Error(chunk.toString())))
      child.once('exit', (code) => reject(new Error(`Servidor encerrou com código ${code}`)))
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao iniciar servidor')), 10_000))
  ])
  return child
}

async function stopServer(child) {
  child.kill()
  if (child.exitCode == null) await once(child, 'exit')
}

function workbookBuffer() {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Número: 'R-1', Status: 'Aberto', 'Aberto em': '30/06/2026' }]), 'Tickets')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

test('cache current.json é recarregado após reiniciar o processo', async () => {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simer-restart-'))
  const port = await freePort()
  let child
  try {
    child = await startServer(port, storageDir)
    const form = new FormData()
    form.append('file', new Blob([workbookBuffer()]), 'persistente.xlsx')
    const upload = await fetch(`http://127.0.0.1:${port}/api/upload/current`, { method: 'POST', body: form })
    assert.equal(upload.status, 201)
    await stopServer(child)
    child = null

    child = await startServer(port, storageDir)
    const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json()
    assert.equal(health.hasCurrentFile, true)
    assert.equal(health.fileName, 'persistente.xlsx')
    assert.equal(health.ticketCount, 1)
    const tickets = await (await fetch(`http://127.0.0.1:${port}/api/tickets`)).json()
    assert.equal(tickets.tickets[0].numero, 'R-1')
  } finally {
    if (child) await stopServer(child)
    await fs.rm(storageDir, { recursive: true, force: true })
  }
})
