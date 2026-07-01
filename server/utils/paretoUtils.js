export const PARETO_THRESHOLD = 80

export const PARETO_DIMENSIONS = Object.freeze({
  cliente: { field: 'clientePessoa', label: 'Cliente', ticketFlag: 'paretoCliente', weight: 20 },
  servico: { field: 'servico', label: 'Serviço', ticketFlag: 'paretoServico', weight: 20 },
  categoria: { field: 'categoria', label: 'Categoria', ticketFlag: 'paretoCategoria', weight: 15 },
  departamento: { field: 'departamento', label: 'Departamento', ticketFlag: 'paretoDepartamento', weight: 10 },
  responsavel: { field: 'responsavel', label: 'Responsável', ticketFlag: 'paretoResponsavel', weight: 5 },
  assuntoRecorrente: { field: 'recorrenciaChave', label: 'Assunto recorrente', ticketFlag: null, weight: 0 }
})

export function calculateParetoDimension(tickets, dimension) {
  const config = PARETO_DIMENSIONS[dimension]
  const groups = new Map()
  for (const ticket of tickets) {
    const name = String(ticket[config.field] || '(vazio)')
    if (!groups.has(name)) groups.set(name, { name, total: 0, abertos: 0, slaVencido: 0, priorizados: 0 })
    const group = groups.get(name)
    group.total += 1
    if (ticket.estaAberto) group.abertos += 1
    if (ticket.estaAberto && ticket.situacaoSLA === 'Vencido') group.slaVencido += 1
    if (ticket.ticketPriorizado) group.priorizados += 1
  }
  const total = tickets.length
  let cumulative = 0
  return [...groups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR')).map((group) => {
    const percentage = total ? (group.total / total) * 100 : 0
    const isPareto = cumulative < PARETO_THRESHOLD
    cumulative += percentage
    return { ...group, percentual: Number(percentage.toFixed(2)), percentualAcumulado: Number(cumulative.toFixed(2)), pareto: isPareto }
  })
}
