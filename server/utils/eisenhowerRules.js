import { normalizeText } from './text.js'

export const EISENHOWER_ACTIONS = Object.freeze({
  'Fazer agora': 'Atuar imediatamente, escalar se necessário e acompanhar até a próxima atualização.',
  Planejar: 'Planejar ação, definir responsável e acompanhar para evitar que vire urgência.',
  'Delegar / tratar com controle': 'Encaminhar ao responsável adequado e controlar prazo de retorno.',
  'Monitorar / baixa prioridade': 'Manter monitorado, tratar conforme capacidade e reavaliar se houver mudança de status.'
})

const CRITICAL_SERVICE_TERMS = ['erp', 'simer', 'siagri', 'financeiro', 'faturamento', 'nota fiscal', 'pagamento', 'bordero', 'romaneio', 'estoque', 'integracao']
const CRITICAL_DEPARTMENT_TERMS = ['financeiro', 'contabilidade', 'contabil', 'graos', 'insumos', 't i', 'ti', 'tecnologia', 'fiscal', 'faturamento']
const IMPORTANT_CATEGORY_TERMS = ['problema', 'bug', 'adequacao', 'solucao de contorno']

function containsAny(value, terms) {
  const text = normalizeText(value)
  return terms.some((term) => text.includes(normalizeText(term)))
}

export function urgencyReasons(ticket) {
  if (!ticket.estaAberto) return []
  const reasons = []
  if (ticket.situacaoSLA === 'Vencido') reasons.push('SLA vencido')
  if (ticket.tempoEmAbertoDias > 7) reasons.push('Aberto há mais de 7 dias')
  if (ticket.tempoSemAtualizacaoDias > 3) reasons.push(`Sem atualização há ${ticket.tempoSemAtualizacaoDias} dias`)
  if (ticket.statusGerencial === 'Em espera' && ticket.tempoSemAtualizacaoDias >= 7) reasons.push('Em espera há muitos dias')
  if (ticket.ticketPriorizado) reasons.push('Ticket priorizado')
  if (containsAny(`${ticket.categoria} ${ticket.assunto}`, ['problema', 'bug', 'erro', 'falha'])) reasons.push('Problema ou falha em aberto')
  if (ticket.scoreRisco >= 60) reasons.push('Alto score de risco')
  if (['P1', 'P2'].includes(ticket.prioridadeGerencial)) reasons.push(`Prioridade gerencial ${ticket.prioridadeGerencial}`)
  return [...new Set(reasons)]
}

export function importanceReasons(ticket, recurring = false) {
  const reasons = []
  if (ticket.ticketPriorizado) reasons.push('Ticket priorizado')
  if (containsAny(ticket.servico, CRITICAL_SERVICE_TERMS)) reasons.push('Serviço crítico')
  if (containsAny(ticket.departamento, CRITICAL_DEPARTMENT_TERMS)) reasons.push('Área crítica')
  if (containsAny(ticket.categoria, IMPORTANT_CATEGORY_TERMS)) reasons.push('Categoria relevante')
  if (ticket.paretoCliente) reasons.push('Cliente no Pareto')
  if (ticket.paretoServico) reasons.push('Serviço no Pareto')
  if (ticket.paretoCategoria) reasons.push('Categoria no Pareto')
  if (ticket.paretoDepartamento) reasons.push('Departamento no Pareto')
  if (ticket.paretoResponsavel) reasons.push('Responsável no Pareto')
  if (ticket.dependenciaExterna) reasons.push('Dependência externa')
  if (ticket.impactoEstimado === 'Alto') reasons.push('Alto impacto estimado')
  if (recurring) reasons.push('Problema recorrente')
  return [...new Set(reasons)]
}

export function classifyQuadrant(urgent, important) {
  if (urgent && important) return 'Fazer agora'
  if (!urgent && important) return 'Planejar'
  if (urgent) return 'Delegar / tratar com controle'
  return 'Monitorar / baixa prioridade'
}

export function promoteImpactByPareto(impact, weight) {
  if (weight >= 50) return impact === 'Baixo' ? 'Médio' : 'Alto'
  if (weight >= 20 && impact === 'Baixo') return 'Médio'
  return impact
}

export function promotePriorityByPareto(priority, weight) {
  if (weight >= 50) return priority === 'P4' ? 'P3' : priority === 'P3' ? 'P2' : priority
  if (weight >= 20 && priority === 'P4') return 'P3'
  return priority
}
