import assert from 'node:assert/strict'
import test from 'node:test'
import { applyEisenhower } from '../services/eisenhowerService.js'
import { analyzePareto, applyParetoToTicket } from '../services/paretoService.js'
import { promotePriorityByPareto } from '../utils/eisenhowerRules.js'

function ticket(overrides = {}) {
  return {
    estaAberto: true, situacaoSLA: 'Dentro do SLA', tempoEmAbertoDias: 1, tempoSemAtualizacaoDias: 0,
    statusGerencial: 'Aberto', ticketPriorizado: false, categoria: 'Dúvida', assunto: 'Orientação simples',
    scoreRisco: 0, prioridadeGerencial: 'P4', servico: 'Serviço comum', departamento: 'Comercial',
    dependenciaExterna: false, impactoEstimado: 'Baixo', paretoCliente: false, paretoServico: false,
    paretoCategoria: false, paretoDepartamento: false, paretoResponsavel: false,
    ...overrides
  }
}

test('Pareto marca os grupos que acumulam até 80% e aplica o peso configurado', () => {
  const tickets = [
    ...Array.from({ length: 8 }, (_, index) => ticket({ numero: `A${index}`, clientePessoa: 'Cliente A', servico: 'ERP', categoria: 'Problema', departamento: 'TI', responsavel: 'Equipe A' })),
    ...Array.from({ length: 2 }, (_, index) => ticket({ numero: `B${index}`, clientePessoa: 'Cliente B', servico: 'Portal', categoria: 'Dúvida', departamento: 'Comercial', responsavel: 'Equipe B' }))
  ]
  const analysis = analyzePareto(tickets)
  assert.equal(analysis.dimensions.cliente[0].percentual, 80)
  assert.equal(analysis.dimensions.cliente[0].pareto, true)
  assert.equal(analysis.dimensions.cliente[1].pareto, false)
  const enriched = applyParetoToTicket(tickets[0], analysis)
  assert.equal(enriched.paretoCliente, true)
  assert.equal(enriched.pesoPareto, 70)
  assert.equal(promotePriorityByPareto('P4', enriched.pesoPareto), 'P3')
})

test('Eisenhower classifica os quatro quadrantes e recomenda a ação correspondente', () => {
  const now = applyEisenhower(ticket({ situacaoSLA: 'Vencido', paretoCliente: true }))
  const plan = applyEisenhower(ticket({ servico: 'ERP Simer' }))
  const delegate = applyEisenhower(ticket({ situacaoSLA: 'Vencido' }))
  const monitor = applyEisenhower(ticket())
  assert.equal(now.quadranteEisenhower, 'Fazer agora')
  assert.equal(plan.quadranteEisenhower, 'Planejar')
  assert.equal(delegate.quadranteEisenhower, 'Delegar / tratar com controle')
  assert.equal(monitor.quadranteEisenhower, 'Monitorar / baixa prioridade')
  assert.match(now.acaoRecomendada, /Atuar imediatamente/)
  assert.deepEqual(delegate.motivoUrgencia, ['SLA vencido'])
})
