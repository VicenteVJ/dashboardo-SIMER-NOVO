import { calculateParetoDimension, PARETO_DIMENSIONS } from '../utils/paretoUtils.js'

export function analyzePareto(tickets) {
  const backlog = tickets.filter((ticket) => ticket.estaAberto)
  const dimensions = Object.fromEntries(Object.keys(PARETO_DIMENSIONS).map((dimension) => [dimension, calculateParetoDimension(backlog, dimension)]))
  const memberships = Object.fromEntries(Object.entries(dimensions).map(([dimension, groups]) => [dimension, new Set(groups.filter((group) => group.pareto).map((group) => group.name))]))
  return { totalBacklog: backlog.length, dimensions, memberships }
}

export function applyParetoToTicket(ticket, analysis) {
  let pesoPareto = 0
  const activeGroups = []
  const flags = {}
  for (const [dimension, config] of Object.entries(PARETO_DIMENSIONS)) {
    if (!config.ticketFlag) continue
    const belongs = analysis.memberships[dimension].has(String(ticket[config.field] || '(vazio)'))
    flags[config.ticketFlag] = belongs
    if (belongs) { pesoPareto += config.weight; activeGroups.push({ label: config.label, weight: config.weight }) }
  }
  activeGroups.sort((a, b) => b.weight - a.weight)
  return { ...ticket, ...flags, pesoPareto, grupoParetoPrincipal: activeGroups[0]?.label || 'Fora do Pareto' }
}
