import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateDataQuality } from '../utils/dataQualityRules.js'
import { classifyItilType, classifyManagerialStatus, inferManagerialOwner, inferWaitingReason } from '../utils/itilClassifier.js'
import { createRecurrenceKey } from '../utils/recurrence.js'
import { calculateSla } from '../utils/slaRules.js'

test('status gerencial cobre aberto, espera, encerrado, cancelado e desconhecido', () => {
  assert.equal(classifyManagerialStatus('Em andamento'), 'Aberto')
  assert.equal(classifyManagerialStatus('Aguardando retorno'), 'Em espera')
  assert.equal(classifyManagerialStatus('Resolvido'), 'Encerrado')
  assert.equal(classifyManagerialStatus('Cancelado'), 'Cancelado')
  assert.equal(classifyManagerialStatus('Status legado'), 'Não classificado')
})

test('SLA usa referência por prioridade e distingue risco, vencimento e cancelamento', () => {
  assert.deepEqual(calculateSla('P3', 2, 'Aberto'), { slaDiasReferencia: 7, percentualSLAConsumido: 29, situacaoSLA: 'Dentro do SLA' })
  assert.equal(calculateSla('P3', 6, 'Aberto').situacaoSLA, 'Em risco')
  assert.equal(calculateSla('P3', 8, 'Aberto').situacaoSLA, 'Vencido')
  assert.equal(calculateSla('P1', 5, 'Cancelado').situacaoSLA, 'Sem SLA')
})

test('classificação ITIL e recorrência usam dados existentes sem nova coluna', () => {
  assert.equal(classifyItilType({ categoria: 'Adequação', assunto: 'Nova regra', servico: 'Fiscal' }), 'Mudança / Adequação')
  assert.equal(classifyItilType({ categoria: 'Bug', assunto: 'Falha ao salvar', servico: 'ERP' }), 'Incidente')
  const base = { servico: 'Nota Fiscal', categoria: 'Problema' }
  assert.equal(createRecurrenceKey({ ...base, assunto: 'Erro na emissão da nota' }), createRecurrenceKey({ ...base, assunto: 'Problema na emissão da nota' }))
})

test('espera por usuário prevalece sobre inferência externa genérica', () => {
  const ticket = { aguardandoRetorno: true, status: 'Aguardando retorno', assunto: 'Aguardando confirmação do usuário', responsavel: '(vazio)', categoria: 'Dúvida' }
  const reason = inferWaitingReason(ticket, true)
  assert.equal(reason, 'Aguardando usuário')
  assert.equal(inferManagerialOwner(ticket, true, reason), 'Usuário / área solicitante')
})

test('qualidade lista ausências sem alterar o ticket', () => {
  const ticket = { departamento: '(vazio)', responsavel: '(vazio)', categoria: '(vazio)', clientePessoa: '(vazio)', abertoEm: null, ultimaAcao: null }
  const quality = evaluateDataQuality(ticket, 'Não classificado', 'Não classificado', 'Não identificado')
  assert.equal(quality.qualidadeDados.length, 9)
  assert.equal(quality.completudeDadosPercentual, 0)
})
