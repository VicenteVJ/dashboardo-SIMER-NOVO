import { csvEscape } from '../utils/text.js'

const TICKET_COLUMNS = [
  ['numero', '[Excel] Número'], ['abertoEm', '[Excel] Aberto em'], ['departamento', '[Excel] Departamento'],
  ['usuarioSolicitante', '[Excel] Usuário solicitante'], ['clientePessoa', '[Excel] Cliente'], ['servico', '[Excel] Serviço'],
  ['assunto', '[Excel] Assunto'], ['status', '[Excel] Status'], ['ultimaAcao', '[Excel] Última ação'],
  ['responsavel', '[Excel] Responsável'], ['categoria', '[Excel] Categoria'], ['ticketPriorizado', '[Excel] Ticket priorizado'],
  ['tempoEmAbertoDias', '[Calculado] Tempo em aberto (dias)'], ['tempoSemAtualizacaoDias', '[Calculado] Tempo sem atualização (dias)'],
  ['statusGerencial', '[Calculado] Status gerencial'], ['tipoITIL', '[Calculado] Tipo ITIL'],
  ['prioridadeGerencial', '[Calculado] Prioridade gerencial'], ['impactoEstimado', '[Calculado] Impacto estimado'],
  ['urgenciaEstimada', '[Calculado] Urgência estimada'], ['slaDiasReferencia', '[Calculado] SLA referência (dias)'],
  ['situacaoSLA', '[Calculado] Situação SLA'], ['percentualSLAConsumido', '[Calculado] SLA consumido (%)'],
  ['responsavelGerencial', '[Calculado] Responsável gerencial'], ['dependenciaExterna', '[Calculado] Dependência externa'],
  ['motivoEsperaInferido', '[Calculado] Motivo de espera inferido'], ['semAtualizacao', '[Calculado] Sem atualização'],
  ['scoreRisco', '[Calculado] Score de risco'], ['nivelRisco', '[Calculado] Nível de risco'],
  ['recorrenciaChave', '[Calculado] Chave de recorrência'], ['completudeDadosPercentual', '[Calculado] Completude (%)'],
  ['qualidadeDados', '[Calculado] Alertas de qualidade'],
  ['urgente', '[Calculado] Urgente'], ['importante', '[Calculado] Importante'],
  ['quadranteEisenhower', '[Calculado] Quadrante Eisenhower'], ['motivoUrgencia', '[Calculado] Motivos de urgência'],
  ['motivoImportancia', '[Calculado] Motivos de importância'], ['acaoRecomendada', '[Calculado] Ação recomendada'],
  ['paretoCliente', '[Calculado] Pareto cliente'], ['paretoServico', '[Calculado] Pareto serviço'],
  ['paretoCategoria', '[Calculado] Pareto categoria'], ['paretoDepartamento', '[Calculado] Pareto departamento'],
  ['paretoResponsavel', '[Calculado] Pareto responsável'], ['grupoParetoPrincipal', '[Calculado] Grupo Pareto principal'],
  ['pesoPareto', '[Calculado] Peso Pareto']
]

function csv(rows) {
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(';')).join('\r\n')}`
}

export function ticketsToCsv(tickets) {
  return csv([
    TICKET_COLUMNS.map(([, label]) => label),
    ...tickets.map((ticket) => TICKET_COLUMNS.map(([field]) => {
      if (['ticketPriorizado', 'dependenciaExterna', 'semAtualizacao', 'urgente', 'importante', 'paretoCliente', 'paretoServico', 'paretoCategoria', 'paretoDepartamento', 'paretoResponsavel'].includes(field)) return ticket[field] ? 'Sim' : 'Não'
      if (['qualidadeDados', 'motivoUrgencia', 'motivoImportancia'].includes(field)) return (ticket[field] || []).join(' | ')
      return ticket[field]
    }))
  ])
}

export function comparisonToCsv(comparison) {
  const rows = [['Número', 'Tipo', 'Campo', 'Antes', 'Depois']]
  for (const item of comparison?.all || []) {
    if (item.changes?.length) {
      for (const change of item.changes) rows.push([item.numero, item.type, change.label, change.before, change.after])
    } else {
      rows.push([item.numero, item.type, 'Ticket', item.before?.assunto || '', item.after?.assunto || ''])
    }
  }
  return csv(rows)
}
