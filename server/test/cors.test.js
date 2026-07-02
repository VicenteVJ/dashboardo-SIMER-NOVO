import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import * as XLSX from 'xlsx'

const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simer-cors-'))
process.env.STORAGE_DIR = storageDir

const [{ default: app }, { isAllowedOrigin }] = await Promise.all([
  import('../app.js'),
  import('../middleware/cors.js')
])

function workbookBuffer() {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Número: '900', 'Aberto em': '01/07/2026 09:30', Status: 'Aberto', Assunto: 'Teste de CORS' }
  ]), 'Tickets')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function withServer(run) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  try { await run(url) } finally { await new Promise((resolve) => server.close(resolve)) }
}

test.after(async () => fs.rm(storageDir, { recursive: true, force: true }))

test('validação de origem aceita local, Netlify, previews e variáveis de ambiente', () => {
  const defaultsOnly = {}
  assert.equal(isAllowedOrigin(undefined, defaultsOnly), true)
  assert.equal(isAllowedOrigin('http://localhost:5173', defaultsOnly), true)
  assert.equal(isAllowedOrigin('http://localhost:8888', defaultsOnly), true)
  assert.equal(isAllowedOrigin('https://dashboardo-simer-novo.netlify.app', defaultsOnly), true)
  assert.equal(isAllowedOrigin('https://dashboard-simer-novo.netlify.app', defaultsOnly), true)
  assert.equal(isAllowedOrigin('https://deploy-preview-42--dashboardo-simer-novo.netlify.app', defaultsOnly), true)
  assert.equal(isAllowedOrigin('https://feature-x--dashboard-simer-novo.netlify.app', defaultsOnly), true)
  assert.equal(isAllowedOrigin('https://origem-desconhecida.example', defaultsOnly), false)
  assert.equal(isAllowedOrigin('https://cliente.example', { CLIENT_ORIGIN: 'https://cliente.example, https://outro.example' }), true)
  assert.equal(isAllowedOrigin('https://parceiro.example', { ALLOWED_ORIGINS: 'https://parceiro.example' }), true)
})

test('preflight e upload multipart aceitam a origem oficial do Netlify', async () => {
  await withServer(async (url) => {
    const origin = 'https://dashboardo-simer-novo.netlify.app'
    const preflight = await fetch(`${url}/api/upload/current`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    })
    assert.equal(preflight.status, 204)
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin)
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/)

    const form = new FormData()
    form.append('file', new Blob([workbookBuffer()]), 'cors.xlsx')
    const upload = await fetch(`${url}/api/upload/current`, {
      method: 'POST',
      headers: { Origin: origin },
      body: form
    })
    assert.equal(upload.status, 201)
    assert.equal(upload.headers.get('access-control-allow-origin'), origin)
    assert.equal((await upload.json()).success, true)
  })
})
