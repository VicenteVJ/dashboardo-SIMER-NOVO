import { normalizeText } from '../utils/text.js'

function list(value) {
  return Array.isArray(value) ? value : String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
}

function matchesAny(value, requested) {
  if (!requested.length) return true
  const normalized = normalizeText(value)
  return requested.some((item) => normalized === normalizeText(item))
}

function truthy(value) {
  return ['1', 'true', 'sim', 'yes'].includes(normalizeText(value))
}

export function filterTickets(tickets, query = {}) {
  const search = normalizeText(query.search)
  const statuses = list(query.status)
  const departments = list(query.departamento)
  const clients = list(query.clientePessoa)
  const categories = list(query.categoria)
  const services = list(query.servico)
  const owners = list(query.responsavel)
  const managerialStatuses = list(query.statusGerencial)
  const itilTypes = list(query.tipoITIL)
  const managerialPriorities = list(query.prioridadeGerencial)
  const slaSituations = list(query.situacaoSLA)
  const riskLevels = list(query.nivelRisco)
  const managerialOwners = list(query.responsavelGerencial)
  const waitingReasons = list(query.motivoEsperaInferido)
  const eisenhowerQuadrants = list(query.quadranteEisenhower)
  const priorityRequested = query.prioridade != null && query.prioridade !== ''
  const priority = truthy(query.prioridade)

  return tickets.filter((ticket) => {
    const searchable = normalizeText([
      ticket.numero, ticket.assunto, ticket.usuarioSolicitante, ticket.responsavel,
      ticket.clientePessoa, ticket.departamento, ticket.servico, ticket.status, ticket.categoria,
      ticket.statusGerencial, ticket.tipoITIL, ticket.prioridadeGerencial, ticket.situacaoSLA, ticket.nivelRisco,
      ticket.quadranteEisenhower, ticket.grupoParetoPrincipal
    ].join(' '))
    if (search && !searchable.includes(search)) return false
    if (!matchesAny(ticket.status, statuses)) return false
    if (!matchesAny(ticket.departamento, departments)) return false
    if (!matchesAny(ticket.clientePessoa, clients)) return false
    if (!matchesAny(ticket.categoria, categories)) return false
    if (!matchesAny(ticket.servico, services)) return false
    if (!matchesAny(ticket.responsavel, owners)) return false
    if (!matchesAny(ticket.statusGerencial, managerialStatuses)) return false
    if (!matchesAny(ticket.tipoITIL, itilTypes)) return false
    if (!matchesAny(ticket.prioridadeGerencial, managerialPriorities)) return false
    if (!matchesAny(ticket.situacaoSLA, slaSituations)) return false
    if (!matchesAny(ticket.nivelRisco, riskLevels)) return false
    if (!matchesAny(ticket.responsavelGerencial, managerialOwners)) return false
    if (!matchesAny(ticket.motivoEsperaInferido, waitingReasons)) return false
    if (!matchesAny(ticket.quadranteEisenhower, eisenhowerQuadrants)) return false
    if (priorityRequested && ticket.ticketPriorizado !== priority) return false
    if (truthy(query.somenteAberto) && !ticket.estaAberto) return false
    if (query.ano && !String(ticket.mesAno).startsWith(`${query.ano}-`)) return false
    if (query.mes && String(ticket.mesAno).slice(5, 7) !== String(query.mes).padStart(2, '0')) return false
    if (query.aging === '0-3' && !(ticket.estaAberto && ticket.tempoEmAbertoDias <= 3)) return false
    if (query.aging === '4-7' && !(ticket.estaAberto && ticket.tempoEmAbertoDias >= 4 && ticket.tempoEmAbertoDias <= 7)) return false
    if (query.aging === '8-15' && !(ticket.estaAberto && ticket.tempoEmAbertoDias >= 8 && ticket.tempoEmAbertoDias <= 15)) return false
    if (query.aging === '15+' && !(ticket.estaAberto && ticket.tempoEmAbertoDias > 15)) return false
    if (query.categoriaGrupo === 'problema' && !normalizeText(ticket.categoria).includes('problema')) return false
    if (query.categoriaGrupo === 'adequacao-duvida') {
      const category = normalizeText(ticket.categoria)
      if (!category.includes('adequacao') && !category.includes('duvida')) return false
    }
    if (query.indicador === 'em-aberto' && !ticket.estaAberto) return false
    if (query.indicador === 'aguardando' && !ticket.aguardandoRetorno) return false
    if (query.indicador === 'priorizados-abertos' && !(ticket.estaAberto && ticket.ticketPriorizado)) return false
    if (query.indicador === 'fora-prazo' && !ticket.foraDoPrazo) return false
    if (query.indicador === 'fechados' && ticket.estaAberto) return false
    if (query.dependenciaExterna != null && query.dependenciaExterna !== '' && ticket.dependenciaExterna !== truthy(query.dependenciaExterna)) return false
    if (query.semAtualizacao != null && query.semAtualizacao !== '' && ticket.semAtualizacao !== truthy(query.semAtualizacao)) return false
    if (query.governanca === 'p1-abertos' && !(ticket.estaAberto && ticket.prioridadeGerencial === 'P1')) return false
    if (query.governanca === 'p2-abertos' && !(ticket.estaAberto && ticket.prioridadeGerencial === 'P2')) return false
    if (query.governanca === 'sla-vencido' && !(ticket.estaAberto && ticket.situacaoSLA === 'Vencido')) return false
    if (query.governanca === 'sla-risco' && !(ticket.estaAberto && ticket.situacaoSLA === 'Em risco')) return false
    if (query.governanca === 'sem-atualizacao' && !ticket.semAtualizacao) return false
    if (query.governanca === 'dependencia-externa' && !(ticket.estaAberto && ticket.dependenciaExterna)) return false
    if (query.governanca === 'aguardando-fornecedor' && ticket.motivoEsperaInferido !== 'Aguardando fornecedor') return false
    if (query.governanca === 'qualidade' && !(ticket.qualidadeDados?.length)) return false
    return true
  })
}

export function summarize(tickets) {
  const summary = {
    total: tickets.length, emAberto: 0, aguardandoRetorno: 0, priorizadosAbertos: 0, foraDoPrazo: 0,
    fechadosResolvidos: 0, problemas: 0, adequacaoDuvida: 0,
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
  let completenessTotal = 0
  const paretoGroups = { clientes: new Set(), servicos: new Set(), categorias: new Set(), departamentos: new Set(), responsaveis: new Set() }
  for (const ticket of tickets) {
    const category = normalizeText(ticket.categoria)
    if (ticket.estaAberto) {
      summary.emAberto += 1
      if (ticket.ticketPriorizado) summary.priorizadosAbertos += 1
      if (ticket.prioridadeGerencial === 'P1') summary.governanca.p1Abertos += 1
      if (ticket.prioridadeGerencial === 'P2') summary.governanca.p2Abertos += 1
      if (ticket.tempoEmAbertoDias <= 3) summary.aging.zeroATres += 1
      else if (ticket.tempoEmAbertoDias <= 7) summary.aging.quatroASete += 1
      else if (ticket.tempoEmAbertoDias <= 15) summary.aging.oitoAQuinze += 1
      else summary.aging.maisDeQuinze += 1
      const key = ticket.quadranteEisenhower === 'Fazer agora' ? 'fazerAgora' : ticket.quadranteEisenhower === 'Planejar' ? 'planejar' : ticket.quadranteEisenhower === 'Delegar / tratar com controle' ? 'delegar' : 'monitorar'
      const quadrant = summary.eisenhower[key]
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
  for (const quadrant of Object.values(summary.eisenhower)) quadrant.percentualBacklog = summary.emAberto ? Number(((quadrant.total / summary.emAberto) * 100).toFixed(1)) : 0
  for (const [key, groups] of Object.entries(paretoGroups)) summary.pareto[key] = groups.size
  return summary
}
