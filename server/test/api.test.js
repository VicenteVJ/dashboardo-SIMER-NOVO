import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import * as XLSX from 'xlsx'

const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simer-api-'))
process.env.STORAGE_DIR = storageDir
process.env.CLIENT_ORIGIN = 'http://localhost:5173'
const { default: app } = await import('../app.js')

function workbookBuffer(rows) {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Tickets')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function withServer(run) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  try { await run(url) } finally { await new Promise((resolve) => server.close(resolve)) }
}

test.after(async () => fs.rm(storageDir, { recursive: true, force: true }))

test('upload multipart, CORS, filtros, resumo, ticket e exportação funcionam', async () => {
  await withServer(async (url) => {
    const rows = [
      { Número: '100', 'Aberto em': '03/04/2026 14:35', 'Departamento.': 'Fiscal', Status: 'Aguardando retorno', Categoria: 'Problema', Assunto: 'Nota fiscal', 'Cliente (Pessoa)': 'Cliente A', 'Ticket Priorizado': 'Sim' },
      { Número: '101', 'Aberto em': '04/04/2026 09:00', Departamento: 'Financeiro', Status: 'Resolvido', Categoria: 'Dúvida', Assunto: 'Boleto', 'Cliente (Pessoa)': 'Cliente B', 'Ticket Priorizado': 'Não' }
    ]
    const form = new FormData()
    form.append('file', new Blob([workbookBuffer(rows)]), 'base.xlsx')
    const upload = await fetch(`${url}/api/upload/current`, { method: 'POST', body: form, headers: { Origin: 'http://localhost:5173' } })
    assert.equal(upload.status, 201)
    assert.equal(upload.headers.get('access-control-allow-origin'), 'http://localhost:5173')
    const uploaded = await upload.json()
    assert.equal(uploaded.summary.total, 2)
    assert.equal(uploaded.summary.governanca.p1Abertos, 1)

    const preflight = await fetch(`${url}/api/upload/current`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } })
    assert.equal(preflight.status, 204)
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/)

    const ticketResponse = await fetch(`${url}/api/tickets/100`)
    const ticket = await ticketResponse.json()
    assert.equal(new Date(ticket.abertoEm).getMonth(), 3)
    assert.equal(ticket.ticketPriorizado, true)
    assert.equal(ticket.statusGerencial, 'Em espera')
    assert.equal(ticket.prioridadeGerencial, 'P1')
    assert.equal(typeof ticket.scoreRisco, 'number')

    const filtered = await (await fetch(`${url}/api/tickets?status=Aguardando%20retorno&somenteAberto=true`)).json()
    assert.equal(filtered.total, 1)
    assert.equal(filtered.tickets[0].numero, '100')
    const governanceFiltered = await (await fetch(`${url}/api/tickets?statusGerencial=Em%20espera&prioridadeGerencial=P1&dependenciaExterna=true`)).json()
    assert.equal(governanceFiltered.total, 1)
    assert.equal(governanceFiltered.tickets[0].motivoEsperaInferido, 'Aguardando fornecedor')

    const summary = await (await fetch(`${url}/api/summary?categoriaGrupo=problema`)).json()
    assert.equal(summary.total, 1)
    assert.equal(summary.priorizadosAbertos, 1)

    const csv = await fetch(`${url}/api/export/filtered?status=Resolvido`)
    assert.match(csv.headers.get('content-type'), /text\/csv/)
    assert.match(await csv.text(), /101/)
    const enrichedCsv = await (await fetch(`${url}/api/export/filtered?prioridadeGerencial=P1`)).text()
    assert.match(enrichedCsv, /\[Calculado\] Prioridade gerencial/)

    const forbidden = await fetch(`${url}/api/health`, { headers: { Origin: 'http://malicioso.local' } })
    assert.equal(forbidden.status, 403)
    assert.equal((await forbidden.json()).error, 'Origem não autorizada pelo CORS.')

    await fs.access(path.join(storageDir, 'current.xlsx'))
    await fs.access(path.join(storageDir, 'current.json'))
    const raw = JSON.parse(await fs.readFile(path.join(storageDir, 'current.raw.json'), 'utf8'))
    assert.equal(raw.rows[0].Número, '100')
  })
})

test('comparação multipart persiste os dois Excel e o resultado', async () => {
  await withServer(async (url) => {
    const oldRows = [{ Número: '1', Status: 'Aberto', Assunto: 'Um' }, { Número: '2', Status: 'Aberto', Assunto: 'Dois' }]
    const newRows = [{ Número: '1', Status: 'Resolvido', Assunto: 'Um' }, { Número: '3', Status: 'Aberto', Assunto: 'Três' }]
    const form = new FormData()
    form.append('oldFile', new Blob([workbookBuffer(oldRows)]), 'old.xlsx')
    form.append('newFile', new Blob([workbookBuffer(newRows)]), 'new.xlsx')
    const response = await fetch(`${url}/api/compare`, { method: 'POST', body: form })
    assert.equal(response.status, 200)
    const result = await response.json()
    assert.equal(result.counts.novos, 1)
    assert.equal(result.counts.removidos, 1)
    assert.equal(result.counts.alterados, 1)
    assert.equal(result.counts.totalComparado, 3)
    assert.equal(result.counts.resolvidosNoNovo, 1)
    for (const file of ['old.xlsx', 'new.xlsx', 'comparison.json']) await fs.access(path.join(storageDir, file))
    const exportResponse = await fetch(`${url}/api/export/comparison`)
    assert.equal(exportResponse.status, 200)
    assert.match(await exportResponse.text(), /Status/)
  })
})

test('rejeita extensão diferente de .xlsx sem substituir o cache', async () => {
  await withServer(async (url) => {
    const before = await fs.readFile(path.join(storageDir, 'current.json'), 'utf8')
    const form = new FormData()
    form.append('file', new Blob(['não é excel']), 'base.csv')
    const response = await fetch(`${url}/api/upload/current`, { method: 'POST', body: form })
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /\.xlsx/)
    assert.equal(await fs.readFile(path.join(storageDir, 'current.json'), 'utf8'), before)
  })
})

test('remoção limpa Excel, JSON e estado em memória', async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/upload/current`, { method: 'DELETE' })
    assert.equal(response.status, 200)
    const health = await (await fetch(`${url}/api/health`)).json()
    assert.equal(health.hasCurrentFile, false)
    assert.equal(health.ticketCount, 0)
    await assert.rejects(fs.access(path.join(storageDir, 'current.xlsx')))
    await assert.rejects(fs.access(path.join(storageDir, 'current.json')))
    await assert.rejects(fs.access(path.join(storageDir, 'current.raw.json')))
  })
})
