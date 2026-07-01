function missing(value) {
  return value == null || value === '' || value === '(vazio)'
}

export function evaluateDataQuality(ticket, statusGerencial, tipoITIL, responsavelGerencial) {
  const checks = [
    [missing(ticket.departamento), 'Sem departamento'],
    [missing(ticket.responsavel), 'Sem responsável'],
    [missing(ticket.categoria), 'Sem categoria'],
    [missing(ticket.clientePessoa), 'Sem cliente'],
    [!ticket.abertoEm, 'Sem data de abertura'],
    [!ticket.ultimaAcao, 'Sem última ação'],
    [statusGerencial === 'Não classificado', 'Status desconhecido'],
    [tipoITIL === 'Não classificado', 'Categoria não classificada'],
    [responsavelGerencial === 'Não identificado', 'Responsável não identificado']
  ]
  const alerts = checks.filter(([failed]) => failed).map(([, label]) => label)
  const coreChecks = checks.slice(0, 7)
  const validCoreFields = coreChecks.filter(([failed]) => !failed).length
  return { qualidadeDados: alerts, completudeDadosPercentual: Math.round((validCoreFields / coreChecks.length) * 100) }
}
