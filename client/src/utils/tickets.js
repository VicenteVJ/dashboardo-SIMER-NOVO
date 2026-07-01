export const EMPTY_SUMMARY = {
  total: 0, emAberto: 0, aguardandoRetorno: 0, priorizadosAbertos: 0,
  foraDoPrazo: 0, fechadosResolvidos: 0, problemas: 0, adequacaoDuvida: 0,
  aging: { zeroATres: 0, quatroASete: 0, oitoAQuinze: 0, maisDeQuinze: 0 },
  governanca: { p1Abertos: 0, p2Abertos: 0, slaVencido: 0, slaEmRisco: 0, semAtualizacao3: 0, semAtualizacao7: 0, p1p2SemAtualizacao: 0, dependenciaExterna: 0, aguardandoFornecedor: 0, aguardandoMuitoTempo: 0 },
  qualidade: { semDepartamento: 0, semResponsavel: 0, semCategoria: 0, semCliente: 0, semUltimaAcao: 0, statusDesconhecido: 0, ticketsComAlerta: 0, completudePercentual: 100 },
  eisenhower: {
    fazerAgora: { total: 0, percentualBacklog: 0, priorizados: 0, slaVencido: 0, semAtualizacao: 0 },
    planejar: { total: 0, percentualBacklog: 0, priorizados: 0, slaVencido: 0, semAtualizacao: 0 },
    delegar: { total: 0, percentualBacklog: 0, priorizados: 0, slaVencido: 0, semAtualizacao: 0 },
    monitorar: { total: 0, percentualBacklog: 0, priorizados: 0, slaVencido: 0, semAtualizacao: 0 }
  },
  pareto: { clientes: 0, servicos: 0, categorias: 0, departamentos: 0, responsaveis: 0 }
}

export const MOVIEDESK_TICKET_BASE_URL = 'https://siagri.movidesk.com/Ticket/Edit/'

export function movideskTicketUrl(number) {
  return `${MOVIEDESK_TICKET_BASE_URL}${encodeURIComponent(String(number ?? '').trim())}`
}

export function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function formatDate(value) {
  if (!value) return '(vazio)'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '(vazio)' : new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

export function statusTone(status) {
  const text = normalize(status)
  if (text.includes('resolvid') || text.includes('fechad')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (text.includes('aguard')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  if (text.includes('cancel')) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
}

export function priorityTone(priority) {
  return { P1: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', P2: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', P3: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', P4: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }[priority] || 'bg-slate-100 text-slate-600'
}

export function riskTone(risk) {
  return { 'Crítico': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', Alto: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', Médio: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', Baixo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }[risk] || 'bg-slate-100 text-slate-600'
}

export function slaTone(sla) {
  return { Vencido: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', 'Em risco': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', 'Dentro do SLA': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' }[sla] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

export function eisenhowerTone(quadrant) {
  return { 'Fazer agora': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', Planejar: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', 'Delegar / tratar com controle': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', 'Monitorar / baixa prioridade': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }[quadrant] || 'bg-slate-100 text-slate-600'
}

export function riskSort(a, b) {
  const quadrantRank = { 'Fazer agora': 0, Planejar: 1, 'Delegar / tratar com controle': 2, 'Monitorar / baixa prioridade': 3 }
  if ((quadrantRank[a.quadranteEisenhower] ?? 4) !== (quadrantRank[b.quadranteEisenhower] ?? 4)) return (quadrantRank[a.quadranteEisenhower] ?? 4) - (quadrantRank[b.quadranteEisenhower] ?? 4)
  if ((a.scoreRisco ?? 0) !== (b.scoreRisco ?? 0)) return (b.scoreRisco ?? 0) - (a.scoreRisco ?? 0)
  if ((a.situacaoSLA === 'Vencido') !== (b.situacaoSLA === 'Vencido')) return Number(b.situacaoSLA === 'Vencido') - Number(a.situacaoSLA === 'Vencido')
  const aPriority = a.estaAberto && a.ticketPriorizado ? 1 : 0
  const bPriority = b.estaAberto && b.ticketPriorizado ? 1 : 0
  if (aPriority !== bPriority) return bPriority - aPriority
  if ((a.tempoSemAtualizacaoDias ?? 0) !== (b.tempoSemAtualizacaoDias ?? 0)) return (b.tempoSemAtualizacaoDias ?? 0) - (a.tempoSemAtualizacaoDias ?? 0)
  if (a.tempoEmAbertoDias !== b.tempoEmAbertoDias) return b.tempoEmAbertoDias - a.tempoEmAbertoDias
  return Number(b.aguardandoRetorno) - Number(a.aguardandoRetorno)
}

export function aggregate(tickets, field, onlyOpen = false, limit) {
  const counts = new Map()
  for (const ticket of tickets) {
    if (onlyOpen && !ticket.estaAberto) continue
    const key = ticket[field] || '(vazio)'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const result = [...counts].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
  return limit ? result.slice(0, limit) : result
}

export function makeSummary(tickets) {
  const summary = {
    ...EMPTY_SUMMARY, aging: { ...EMPTY_SUMMARY.aging }, governanca: { ...EMPTY_SUMMARY.governanca }, qualidade: { ...EMPTY_SUMMARY.qualidade },
    eisenhower: Object.fromEntries(Object.entries(EMPTY_SUMMARY.eisenhower).map(([key, value]) => [key, { ...value }])), pareto: { ...EMPTY_SUMMARY.pareto }
  }
  summary.total = tickets.length
  let completenessTotal = 0
  const paretoGroups = { clientes: new Set(), servicos: new Set(), categorias: new Set(), departamentos: new Set(), responsaveis: new Set() }
  for (const ticket of tickets) {
    const category = normalize(ticket.categoria)
    if (ticket.estaAberto) {
      summary.emAberto += 1
      if (ticket.ticketPriorizado) summary.priorizadosAbertos += 1
      if (ticket.prioridadeGerencial === 'P1') summary.governanca.p1Abertos += 1
      if (ticket.prioridadeGerencial === 'P2') summary.governanca.p2Abertos += 1
      if (ticket.tempoEmAbertoDias <= 3) summary.aging.zeroATres += 1
      else if (ticket.tempoEmAbertoDias <= 7) summary.aging.quatroASete += 1
      else if (ticket.tempoEmAbertoDias <= 15) summary.aging.oitoAQuinze += 1
      else summary.aging.maisDeQuinze += 1
      const quadrantKey = ticket.quadranteEisenhower === 'Fazer agora' ? 'fazerAgora' : ticket.quadranteEisenhower === 'Planejar' ? 'planejar' : ticket.quadranteEisenhower === 'Delegar / tratar com controle' ? 'delegar' : 'monitorar'
      const quadrant = summary.eisenhower[quadrantKey]
      quadrant.total += 1
      if (ticket.ticketPriorizado) quadrant.priorizados += 1
      if (ticket.situacaoSLA === 'Vencido') quadrant.slaVencido += 1
      if (ticket.semAtualizacao) quadrant.semAtualizacao += 1
      if (ticket.paretoCliente) paretoGroups.clientes.add(ticket.clientePessoa)
      if (ticket.paretoServico) paretoGroups.servicos.add(ticket.servico)
      if (ticket.paretoCategoria) paretoGroups.categorias.add(ticket.categoria)
      if (ticket.paretoDepartamento) paretoGroups.departamentos.add(ticket.departamento)
      if (ticket.paretoResponsavel) paretoGroups.responsaveis.add(ticket.responsavel)
    } else summary.fechadosResolvidos += 1
    if (ticket.aguardandoRetorno) summary.aguardandoRetorno += 1
    if (ticket.foraDoPrazo) summary.foraDoPrazo += 1
    if (category.includes('problema')) summary.problemas += 1
    if (category.includes('adequacao') || category.includes('duvida')) summary.adequacaoDuvida += 1
    if (ticket.estaAberto && ticket.situacaoSLA === 'Vencido') summary.governanca.slaVencido += 1
    if (ticket.estaAberto && ticket.situacaoSLA === 'Em risco') summary.governanca.slaEmRisco += 1
    if (ticket.semAtualizacao) summary.governanca.semAtualizacao3 += 1
    if (ticket.estaAberto && ticket.tempoSemAtualizacaoDias >= 7) summary.governanca.semAtualizacao7 += 1
    if (ticket.semAtualizacao && ['P1', 'P2'].includes(ticket.prioridadeGerencial)) summary.governanca.p1p2SemAtualizacao += 1
    if (ticket.estaAberto && ticket.dependenciaExterna) summary.governanca.dependenciaExterna += 1
    if (ticket.motivoEsperaInferido === 'Aguardando fornecedor') summary.governanca.aguardandoFornecedor += 1
    if (ticket.statusGerencial === 'Em espera' && ticket.tempoSemAtualizacaoDias >= 7) summary.governanca.aguardandoMuitoTempo += 1
    const alerts = ticket.qualidadeDados || []
    if (alerts.length) summary.qualidade.ticketsComAlerta += 1
    if (alerts.includes('Sem departamento')) summary.qualidade.semDepartamento += 1
    if (alerts.includes('Sem responsável')) summary.qualidade.semResponsavel += 1
    if (alerts.includes('Sem categoria')) summary.qualidade.semCategoria += 1
    if (alerts.includes('Sem cliente')) summary.qualidade.semCliente += 1
    if (alerts.includes('Sem última ação')) summary.qualidade.semUltimaAcao += 1
    if (alerts.includes('Status desconhecido')) summary.qualidade.statusDesconhecido += 1
    completenessTotal += ticket.completudeDadosPercentual ?? 100
  }
  summary.qualidade.completudePercentual = tickets.length ? Math.round(completenessTotal / tickets.length) : 100
  Object.values(summary.eisenhower).forEach((quadrant) => { quadrant.percentualBacklog = summary.emAberto ? Number(((quadrant.total / summary.emAberto) * 100).toFixed(1)) : 0 })
  Object.entries(paretoGroups).forEach(([key, groups]) => { summary.pareto[key] = groups.size })
  return summary
}

export function queryFromFilters(filters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) params.set(key, value.join(','))
    else if (!Array.isArray(value) && value !== '' && value != null && value !== false) params.set(key, value === true ? 'true' : value)
  })
  return params.toString()
}
