export const EISENHOWER_QUADRANTS = [
  { name: 'Fazer agora', key: 'fazerAgora', tone: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40' },
  { name: 'Planejar', key: 'planejar', tone: 'border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40' },
  { name: 'Delegar / tratar com controle', key: 'delegar', tone: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40' },
  { name: 'Monitorar / baixa prioridade', key: 'monitorar', tone: 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800' }
]

function topValues(tickets, field, limit = 3) {
  const counts = new Map()
  tickets.forEach((ticket) => counts.set(ticket[field] || '(vazio)', (counts.get(ticket[field] || '(vazio)') || 0) + 1))
  return [...counts].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, limit)
}

export function buildEisenhowerMatrix(tickets) {
  const open = tickets.filter((ticket) => ticket.estaAberto)
  return EISENHOWER_QUADRANTS.map((config) => {
    const items = open.filter((ticket) => ticket.quadranteEisenhower === config.name)
    return {
      ...config,
      items,
      total: items.length,
      percentual: open.length ? Number(((items.length / open.length) * 100).toFixed(1)) : 0,
      priorizados: items.filter((ticket) => ticket.ticketPriorizado).length,
      slaVencido: items.filter((ticket) => ticket.situacaoSLA === 'Vencido').length,
      semAtualizacao: items.filter((ticket) => ticket.semAtualizacao).length,
      tempoMedio: items.length ? Math.round(items.reduce((sum, ticket) => sum + ticket.tempoEmAbertoDias, 0) / items.length) : 0,
      servicos: topValues(items, 'servico'),
      clientes: topValues(items, 'clientePessoa')
    }
  })
}

export const PARETO_VIEW_DIMENSIONS = {
  cliente: { label: 'Clientes', field: 'clientePessoa', flag: 'paretoCliente' },
  servico: { label: 'Serviços', field: 'servico', flag: 'paretoServico' },
  categoria: { label: 'Categorias', field: 'categoria', flag: 'paretoCategoria' },
  departamento: { label: 'Departamentos', field: 'departamento', flag: 'paretoDepartamento' },
  responsavel: { label: 'Responsáveis', field: 'responsavel', flag: 'paretoResponsavel' }
}

export function buildParetoView(tickets, dimension, limit = 15) {
  const config = PARETO_VIEW_DIMENSIONS[dimension]
  const open = tickets.filter((ticket) => ticket.estaAberto)
  const groups = new Map()
  open.forEach((ticket) => {
    const name = ticket[config.field] || '(vazio)'
    if (!groups.has(name)) groups.set(name, { name, total: 0, slaVencido: 0, priorizados: 0, pareto: false })
    const group = groups.get(name)
    group.total += 1
    if (ticket.situacaoSLA === 'Vencido') group.slaVencido += 1
    if (ticket.ticketPriorizado) group.priorizados += 1
    if (ticket[config.flag]) group.pareto = true
  })
  let cumulative = 0
  const all = [...groups.values()].sort((a, b) => b.total - a.total).map((group) => {
    const percentual = open.length ? (group.total / open.length) * 100 : 0
    cumulative += percentual
    return { ...group, percentual: Number(percentual.toFixed(1)), acumulado: Number(cumulative.toFixed(1)) }
  })
  return { all, chart: all.slice(0, limit), totalBacklog: open.length, paretoGroups: all.filter((group) => group.pareto) }
}
