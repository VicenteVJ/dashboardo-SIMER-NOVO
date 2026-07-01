export const SLA_DAYS_BY_PRIORITY = Object.freeze({ P1: 1, P2: 3, P3: 7, P4: 15 })

export function calculateSla(priority, elapsedDays, managerialStatus) {
  const referenceDays = SLA_DAYS_BY_PRIORITY[priority]
  if (!referenceDays || managerialStatus === 'Cancelado' || managerialStatus === 'Não classificado') {
    return { slaDiasReferencia: referenceDays || null, percentualSLAConsumido: null, situacaoSLA: 'Sem SLA' }
  }
  const percentage = Math.max(0, Math.round((elapsedDays / referenceDays) * 100))
  const situation = elapsedDays > referenceDays ? 'Vencido' : percentage >= 80 ? 'Em risco' : 'Dentro do SLA'
  return { slaDiasReferencia: referenceDays, percentualSLAConsumido: percentage, situacaoSLA: situation }
}
