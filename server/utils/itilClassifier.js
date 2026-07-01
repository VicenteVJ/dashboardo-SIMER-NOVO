import { normalizeText } from './text.js'

const EXTERNAL_TERMS = ['simer', 'siagri', 'backoffice', 'back office', 'produto', 'fornecedor', 'suporte externo', 'terceiro', 'fabricante']
const CRITICAL_SERVICE_TERMS = ['faturamento', 'pagamento', 'financeiro', 'nota fiscal', 'nfe', 'nf e', 'bordero', 'romaneio', 'estoque', 'integracao', 'erp', 'simer']
const CRITICAL_DEPARTMENT_TERMS = ['financeiro', 'fiscal', 'contabil', 'faturamento', 'tesouraria', 'estoque', 'logistica']

function containsAny(value, terms) {
  const text = normalizeText(value)
  return terms.some((term) => text.includes(normalizeText(term)))
}

export function classifyManagerialStatus(status) {
  const value = normalizeText(status)
  if (['novo', 'em andamento', 'aberto', 'em aberto'].includes(value)) return 'Aberto'
  if (value.includes('aguardando') || value === 'pausado') return 'Em espera'
  if (value === 'fechado' || value === 'resolvido') return 'Encerrado'
  if (value === 'cancelado') return 'Cancelado'
  return 'Não classificado'
}

export function classifyItilType(ticket) {
  const category = normalizeText(ticket.categoria)
  const context = normalizeText(`${ticket.categoria} ${ticket.assunto} ${ticket.servico}`)
  if (containsAny(ticket.assunto, ['recorrente', 'recorrencia', 'novamente', 'repetido', 'repetitiva', 'continua ocorrendo'])) return 'Problema'
  if (category.includes('solucao de contorno')) return 'Solução de contorno'
  if (category.includes('solicitacao de servico') || category === 'solicitacao') return 'Requisição de serviço'
  if (category.includes('adequacao') || containsAny(context, ['mudanca', 'alteracao de regra'])) return 'Mudança / Adequação'
  if (category.includes('duvida') || containsAny(context, ['orientacao', 'como fazer'])) return 'Dúvida / orientação'
  if (category.includes('problema')) return 'Problema'
  if (containsAny(context, ['bug', 'erro', 'falha', 'indisponivel'])) return 'Incidente'
  return 'Não classificado'
}

export function estimateImpact(ticket, tipoITIL) {
  if (ticket.ticketPriorizado) return 'Alto'
  if (containsAny(ticket.servico, CRITICAL_SERVICE_TERMS)) return 'Alto'
  if (ticket.estaAberto && ['Incidente', 'Problema'].includes(tipoITIL)) return 'Alto'
  if (['Mudança / Adequação', 'Dúvida / orientação', 'Requisição de serviço'].includes(tipoITIL) || containsAny(ticket.departamento, CRITICAL_DEPARTMENT_TERMS)) return 'Médio'
  return 'Baixo'
}

export function estimateUrgency(ticket, tempoSemAtualizacaoDias) {
  if (ticket.ticketPriorizado || ticket.tempoEmAbertoDias > 7 || tempoSemAtualizacaoDias > 3 || (ticket.aguardandoRetorno && tempoSemAtualizacaoDias >= 3)) return 'Alta'
  if (ticket.tempoEmAbertoDias >= 4 || tempoSemAtualizacaoDias >= 2) return 'Média'
  return 'Baixa'
}

export function calculateManagerialPriority(impact, urgency) {
  if (impact === 'Alto' && urgency === 'Alta') return 'P1'
  if ((impact === 'Alto' && urgency === 'Média') || (impact === 'Médio' && urgency === 'Alta')) return 'P2'
  if (impact === 'Médio' && urgency === 'Média') return 'P3'
  return 'P4'
}

export function inferExternalDependency(ticket) {
  if (containsAny(ticket.responsavel, EXTERNAL_TERMS)) return true
  if (containsAny(ticket.assunto, ['correcao do sistema', 'nova versao', 'bug do erp', 'integracao externa', 'ajuste no erp', 'fornecedor'])) return true
  return ticket.aguardandoRetorno && (ticket.responsavel === '(vazio)' || containsAny(`${ticket.assunto} ${ticket.responsavel}`, EXTERNAL_TERMS))
}

export function inferWaitingReason(ticket, dependencyExternal) {
  if (!ticket.aguardandoRetorno && normalizeText(ticket.status) !== 'pausado') return 'Não aplicável'
  const context = `${ticket.assunto} ${ticket.responsavel} ${ticket.categoria}`
  if (containsAny(ticket.responsavel, EXTERNAL_TERMS)) return 'Aguardando fornecedor'
  if (containsAny(context, ['validacao interna', 'homologacao interna', 'aprovacao interna'])) return 'Aguardando validação interna'
  if (containsAny(context, ['validacao', 'retorno', 'confirmacao', 'usuario', 'cliente', 'solicitante'])) return 'Aguardando usuário'
  if (dependencyExternal || containsAny(context, EXTERNAL_TERMS)) return 'Aguardando fornecedor'
  if (containsAny(context, ['analise', 'tecnica', 'investigacao', 'diagnostico'])) return 'Aguardando análise técnica'
  if (normalizeText(ticket.status) === 'pausado') return 'Pausado sem motivo claro'
  return 'Não identificado'
}

export function inferManagerialOwner(ticket, dependencyExternal, waitingReason) {
  if (waitingReason === 'Aguardando usuário' || containsAny(ticket.responsavel, ['usuario', 'cliente', 'solicitante'])) return 'Usuário / área solicitante'
  if (dependencyExternal || waitingReason === 'Aguardando fornecedor') return 'Fornecedor'
  if (ticket.responsavel && ticket.responsavel !== '(vazio)') return 'Interno'
  return 'Não identificado'
}
