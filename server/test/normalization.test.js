import assert from 'node:assert/strict'
import test from 'node:test'
import { compareTickets } from '../services/comparisonService.js'
import { filterTickets, summarize } from '../services/filterService.js'
import { normalizeRows } from '../services/normalizationService.js'
import { enrichTicket } from '../services/ticketEnrichmentService.js'
import { parseDate } from '../utils/date.js'

test('interpreta DD/MM/YYYY HH:mm como data brasileira, não americana', () => {
  const parsed = parseDate('03/04/2026 14:35')
  assert.equal(parsed.getFullYear(), 2026)
  assert.equal(parsed.getMonth(), 3)
  assert.equal(parsed.getDate(), 3)
  assert.equal(parsed.getHours(), 14)
  assert.equal(parsed.getMinutes(), 35)
  assert.equal(parseDate('31/02/2026 10:00'), null)
})

test('normaliza cabeçalhos flexíveis e aplica regras de negócio', () => {
  const [ticket] = normalizeRows([{
    'Número.': 4201,
    'Aberto em': '20/06/2026 08:30',
    'Departamento.': 'Financeiro',
    'Usuário Solicitante': 'Ana',
    'Serviço (2º Nível)': 'ERP / Fiscal',
    Assunto: 'Falha ao emitir nota',
    Responsável: '',
    Categoria: 'Problema',
    'Data da última ação': '21/06/2026 17:00',
    Status: 'Aguardando retorno',
    'Cliente (Pessoa)': 'Empresa A',
    'Ticket Priorizado': 'Sim'
  }], new Date(2026, 5, 30, 12))

  assert.equal(ticket.numero, '4201')
  assert.equal(ticket.abertoEm, '2026-06-20T08:30:00')
  assert.equal(ticket.departamento, 'Financeiro')
  assert.equal(ticket.servico, 'ERP / Fiscal')
  assert.equal(ticket.clientePessoa, 'Empresa A')
  assert.equal(ticket.responsavel, '(vazio)')
  assert.equal(ticket.mesAno, '2026-06')
  assert.equal(ticket.tempoEmAbertoDias, 10)
  assert.equal(ticket.estaAberto, true)
  assert.equal(ticket.aguardandoRetorno, true)
  assert.equal(ticket.foraDoPrazo, true)
  assert.equal(ticket.ticketPriorizado, true)
})

test('filtra múltiplos status e resume o resultado', () => {
  const tickets = normalizeRows([
    { Número: '1', Status: 'Aberto', Categoria: 'Problema', 'Aberto em': '20/06/2026' },
    { Número: '2', Status: 'Resolvido', Categoria: 'Dúvida', 'Aberto em': '21/06/2026' },
    { Número: '3', Status: 'Aguardando', Categoria: 'Adequação', 'Aberto em': '22/06/2026' }
  ], new Date(2026, 5, 30))
  const filtered = filterTickets(tickets, { status: 'Aberto,Aguardando', somenteAberto: 'true' })
  assert.deepEqual(filtered.map((ticket) => ticket.numero), ['1', '3'])
  assert.equal(summarize(filtered).emAberto, 2)
  assert.deepEqual(filterTickets(tickets, { indicador: 'aguardando' }).map((ticket) => ticket.numero), ['3'])
  assert.deepEqual(filterTickets(tickets, { indicador: 'fechados' }).map((ticket) => ticket.numero), ['2'])
})

test('comparação identifica novos, removidos e campos alterados', () => {
  const oldTickets = [{ numero: '1', status: 'Aberto', assunto: 'A' }, { numero: '2', status: 'Aberto', assunto: 'B' }]
  const newTickets = [{ numero: '1', status: 'Resolvido', assunto: 'A' }, { numero: '3', status: 'Aberto', assunto: 'C' }]
  const result = compareTickets(oldTickets, newTickets)
  assert.equal(result.counts.novos, 1)
  assert.equal(result.counts.removidos, 1)
  assert.equal(result.counts.alterados, 1)
  assert.equal(result.counts.totalComparado, 3)
  assert.equal(result.changedTickets[0].changes[0].field, 'status')
})

test('enriquecimento calcula ITIL, prioridade, SLA, risco e qualidade sem alterar campos normalizados', () => {
  const [normalized] = normalizeRows([{
    Número: 'G-1', 'Aberto em': '20/06/2026 08:00', Departamento: 'Financeiro',
    'Usuário solicitante': 'Ana', Serviço: 'Faturamento ERP', Assunto: 'Falha recorrente na nota fiscal',
    Responsável: 'Equipe interna', Categoria: 'Problema', 'Data da última ação': '25/06/2026 10:00',
    Status: 'Em andamento', 'Cliente (Pessoa)': 'Cliente A', 'Ticket Priorizado': 'Sim'
  }], new Date(2026, 5, 30, 12))
  const enriched = enrichTicket(normalized, new Date(2026, 5, 30, 12))
  assert.equal(enriched.assunto, normalized.assunto)
  assert.equal(enriched.statusGerencial, 'Aberto')
  assert.equal(enriched.tipoITIL, 'Problema')
  assert.equal(enriched.prioridadeGerencial, 'P1')
  assert.equal(enriched.situacaoSLA, 'Vencido')
  assert.equal(enriched.tempoSemAtualizacaoDias, 5)
  assert.equal(enriched.semAtualizacao, true)
  assert.equal(enriched.dependenciaExterna, false)
  assert.equal(enriched.scoreRisco, 75)
  assert.equal(enriched.nivelRisco, 'Alto')
  assert.deepEqual(enriched.qualidadeDados, [])
})
