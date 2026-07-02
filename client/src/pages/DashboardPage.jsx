import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { api } from '../api'
import ChartsGrid from '../components/ChartsGrid'
import EisenhowerSection from '../components/EisenhowerSection'
import EmptyState from '../components/EmptyState'
import FilterBar from '../components/FilterBar'
import MetricGrid from '../components/MetricGrid'
import ParetoSection from '../components/ParetoSection'
import StatCard from '../components/StatCard'
import TicketModal from '../components/TicketModal'
import TicketTable from '../components/TicketTable'
import { useData } from '../context/DataContext'
import { makeSummary, normalize, queryFromFilters } from '../utils/tickets'

const INITIAL_FILTERS = {
  search: '', status: [], departamento: '', clientePessoa: '', categoria: '', servico: '', responsavel: '', categoriaGrupo: '', prioridade: '', ano: '', mes: '', somenteAberto: false, aging: '', indicador: '', governanca: '', quadranteEisenhower: '',
  statusGerencial: '', tipoITIL: '', prioridadeGerencial: '', situacaoSLA: '', nivelRisco: '', responsavelGerencial: '', dependenciaExterna: '', semAtualizacao: '', motivoEsperaInferido: ''
}
const SEARCH_CACHE = new WeakMap()

function searchableTicket(ticket) {
  if (!SEARCH_CACHE.has(ticket)) SEARCH_CACHE.set(ticket, normalize(Object.values(ticket).join(' ')))
  return SEARCH_CACHE.get(ticket)
}

function applyFilters(tickets, filters) {
  const search = normalize(filters.search)
  return tickets.filter((ticket) => {
    const haystack = searchableTicket(ticket)
    if (search && !haystack.includes(search)) return false
    if (filters.status.length && !filters.status.includes(ticket.status)) return false
    if (filters.departamento && ticket.departamento !== filters.departamento) return false
    if (filters.clientePessoa && ticket.clientePessoa !== filters.clientePessoa) return false
    if (filters.categoria && ticket.categoria !== filters.categoria) return false
    if (filters.servico && ticket.servico !== filters.servico) return false
    if (filters.responsavel && ticket.responsavel !== filters.responsavel) return false
    if (filters.quadranteEisenhower && ticket.quadranteEisenhower !== filters.quadranteEisenhower) return false
    if (filters.statusGerencial && ticket.statusGerencial !== filters.statusGerencial) return false
    if (filters.tipoITIL && ticket.tipoITIL !== filters.tipoITIL) return false
    if (filters.prioridadeGerencial && ticket.prioridadeGerencial !== filters.prioridadeGerencial) return false
    if (filters.situacaoSLA && ticket.situacaoSLA !== filters.situacaoSLA) return false
    if (filters.nivelRisco && ticket.nivelRisco !== filters.nivelRisco) return false
    if (filters.responsavelGerencial && ticket.responsavelGerencial !== filters.responsavelGerencial) return false
    if (filters.motivoEsperaInferido && ticket.motivoEsperaInferido !== filters.motivoEsperaInferido) return false
    if (filters.dependenciaExterna !== '' && ticket.dependenciaExterna !== (filters.dependenciaExterna === 'true')) return false
    if (filters.semAtualizacao !== '' && ticket.semAtualizacao !== (filters.semAtualizacao === 'true')) return false
    if (filters.categoriaGrupo === 'problema' && !normalize(ticket.categoria).includes('problema')) return false
    if (filters.categoriaGrupo === 'adequacao-duvida' && !normalize(ticket.categoria).includes('adequacao') && !normalize(ticket.categoria).includes('duvida')) return false
    if (filters.prioridade !== '' && ticket.ticketPriorizado !== (filters.prioridade === 'true')) return false
    if (filters.ano && !ticket.mesAno?.startsWith(`${filters.ano}-`)) return false
    if (filters.mes && ticket.mesAno?.slice(5, 7) !== String(filters.mes).padStart(2, '0')) return false
    if (filters.somenteAberto && !ticket.estaAberto) return false
    if (filters.aging === '0-3' && !(ticket.estaAberto && ticket.tempoEmAbertoDias <= 3)) return false
    if (filters.aging === '4-7' && !(ticket.estaAberto && ticket.tempoEmAbertoDias >= 4 && ticket.tempoEmAbertoDias <= 7)) return false
    if (filters.aging === '8-15' && !(ticket.estaAberto && ticket.tempoEmAbertoDias >= 8 && ticket.tempoEmAbertoDias <= 15)) return false
    if (filters.aging === '15+' && !(ticket.estaAberto && ticket.tempoEmAbertoDias > 15)) return false
    if (filters.indicador === 'em-aberto' && !ticket.estaAberto) return false
    if (filters.indicador === 'aguardando' && !ticket.aguardandoRetorno) return false
    if (filters.indicador === 'priorizados-abertos' && !(ticket.estaAberto && ticket.ticketPriorizado)) return false
    if (filters.indicador === 'fora-prazo' && !ticket.foraDoPrazo) return false
    if (filters.indicador === 'fechados' && ticket.estaAberto) return false
    if (filters.governanca === 'p1-abertos' && !(ticket.estaAberto && ticket.prioridadeGerencial === 'P1')) return false
    if (filters.governanca === 'p2-abertos' && !(ticket.estaAberto && ticket.prioridadeGerencial === 'P2')) return false
    if (filters.governanca === 'sla-vencido' && !(ticket.estaAberto && ticket.situacaoSLA === 'Vencido')) return false
    if (filters.governanca === 'sla-risco' && !(ticket.estaAberto && ticket.situacaoSLA === 'Em risco')) return false
    if (filters.governanca === 'sem-atualizacao' && !ticket.semAtualizacao) return false
    if (filters.governanca === 'dependencia-externa' && !(ticket.estaAberto && ticket.dependenciaExterna)) return false
    if (filters.governanca === 'aguardando-fornecedor' && ticket.motivoEsperaInferido !== 'Aguardando fornecedor') return false
    if (filters.governanca === 'qualidade' && !(ticket.qualidadeDados?.length)) return false
    return true
  })
}

export default function DashboardPage() {
  const { tickets, health, loading } = useData()
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [selected, setSelected] = useState(null)
  const deferredSearch = useDeferredValue(filters.search)
  const effectiveFilters = useMemo(() => ({ ...filters, search: deferredSearch }), [
    deferredSearch, filters.status, filters.departamento, filters.clientePessoa, filters.categoria, filters.servico, filters.responsavel,
    filters.categoriaGrupo, filters.prioridade, filters.ano, filters.mes, filters.somenteAberto,
    filters.aging, filters.indicador, filters.governanca, filters.statusGerencial, filters.tipoITIL,
    filters.prioridadeGerencial, filters.situacaoSLA, filters.nivelRisco, filters.responsavelGerencial,
    filters.dependenciaExterna, filters.semAtualizacao, filters.motivoEsperaInferido, filters.quadranteEisenhower
  ])
  const cardScopeFilters = useMemo(() => ({ ...effectiveFilters, indicador: '', categoriaGrupo: '', governanca: '' }), [effectiveFilters])
  const cardScope = useMemo(() => applyFilters(tickets, cardScopeFilters), [tickets, cardScopeFilters])
  const filtered = useMemo(() => applyFilters(tickets, effectiveFilters), [tickets, effectiveFilters])
  const eisenhowerScopeFilters = useMemo(() => ({ ...effectiveFilters, quadranteEisenhower: '' }), [effectiveFilters])
  const eisenhowerScope = useMemo(() => applyFilters(tickets, eisenhowerScopeFilters), [tickets, eisenhowerScopeFilters])
  const cardSummary = useMemo(() => makeSummary(cardScope), [cardScope])
  const visibleSummary = useMemo(() => makeSummary(filtered), [filtered])
  const setIndicator = useCallback((indicador) => setFilters((current) => ({ ...current, indicador: current.indicador === indicador ? '' : indicador })), [])
  const setCategoryGroup = useCallback((categoriaGrupo) => setFilters((current) => ({ ...current, categoria: '', categoriaGrupo: current.categoriaGrupo === categoriaGrupo ? '' : categoriaGrupo })), [])
  const setGovernance = useCallback((governanca) => setFilters((current) => ({ ...current, governanca: current.governanca === governanca ? '' : governanca })), [])
  const handleChartFilter = useCallback((patch) => setFilters((current) => ({
    ...current,
    ...patch,
    status: patch.status ? [patch.status] : current.status,
    categoriaGrupo: patch.categoria ? '' : current.categoriaGrupo
  })), [])
  const handleParetoFilter = useCallback((field, value) => setFilters((current) => ({ ...current, [field]: value, categoriaGrupo: field === 'categoria' ? '' : current.categoriaGrupo })), [])
  if (loading && !health.hasCurrentFile) return <div className="py-24 text-center text-muted">Carregando cache…</div>
  if (!health.hasCurrentFile) return <EmptyState />
  const cards = [
    ['', 'Total da base', cardSummary.total, 'Registros após os filtros', 'blue'],
    ['em-aberto', 'Em aberto', cardSummary.emAberto, 'Backlog operacional', 'violet'],
    ['aguardando', 'Aguardando retorno', cardSummary.aguardandoRetorno, 'Dependem de interação', 'amber'],
    ['priorizados-abertos', 'Priorizados abertos', cardSummary.priorizadosAbertos, 'Criticidade sinalizada', 'red'],
    ['fora-prazo', 'Fora do prazo', cardSummary.foraDoPrazo, 'Abertos há mais de 7 dias', 'red'],
    ['fechados', 'Fechados / resolvidos', cardSummary.fechadosResolvidos, 'Fluxo já encerrado', 'green']
  ]
  const governanceCards = [
    ['p1-abertos', 'P1 abertos', cardSummary.governanca.p1Abertos, 'Impacto e urgência altos', 'red'],
    ['p2-abertos', 'P2 abertos', cardSummary.governanca.p2Abertos, 'Alta relevância gerencial', 'amber'],
    ['sla-vencido', 'SLA vencido', cardSummary.governanca.slaVencido, 'Acima da referência interna', 'red'],
    ['sla-risco', 'SLA em risco', cardSummary.governanca.slaEmRisco, 'Consumo igual ou superior a 80%', 'amber'],
    ['sem-atualizacao', 'Sem atualização +3 dias', cardSummary.governanca.semAtualizacao3, 'Backlog sem movimentação', 'slate'],
    ['dependencia-externa', 'Dependência externa', cardSummary.governanca.dependenciaExterna, 'Fornecedor ou sistema externo', 'violet'],
    ['aguardando-fornecedor', 'Aguardando fornecedor', cardSummary.governanca.aguardandoFornecedor, 'Motivo de espera inferido', 'blue'],
    ['qualidade', 'Qualidade da base', `${cardSummary.qualidade.completudePercentual}%`, `${cardSummary.qualidade.ticketsComAlerta} ticket(s) com alerta`, 'green']
  ]
  return (
    <div className="space-y-3">
      <section><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-brand">Visão operacional</p><h1 className="mt-0.5 text-2xl font-extrabold">Tickets ERP Simer</h1><p className="mt-0.5 max-w-4xl text-[10px] leading-4 text-muted">Foco em gestão: backlog, criticidade, espera e tendência mensal com detalhamento.</p></section>
      <FilterBar tickets={tickets} filters={filters} onChange={setFilters} onClear={() => setFilters(INITIAL_FILTERS)} onExport={() => window.location.assign(api.exportUrl('/api/export/filtered', queryFromFilters(filters)))} />
      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div><h2 className="text-sm font-bold">Indicadores</h2><p className="mt-0.5 text-[10px] text-muted">Clique em um card para aplicar o recorte.</p></div>
          {(filters.categoria || filters.categoriaGrupo) && <button className="btn-secondary px-2.5 py-1.5 text-[10px]" onClick={() => setFilters((current) => ({ ...current, categoria: '', categoriaGrupo: '' }))}><span aria-hidden="true">×</span> Limpar categoria</button>}
        </div>
        <MetricGrid>{cards.map(([id, label, value, note, tone]) => <StatCard key={label} label={label} value={value} note={note} tone={tone} active={filters.indicador === id && Boolean(id)} onClick={() => id ? setIndicator(id) : setFilters((current) => ({ ...current, indicador: '' }))} />)}<StatCard label="Categoria: Problema" value={cardSummary.problemas} note="Ocorrências classificadas" tone="slate" active={filters.categoriaGrupo === 'problema'} onClick={() => setCategoryGroup('problema')} /><StatCard label="Adequação / Dúvida" value={cardSummary.adequacaoDuvida} note="Demandas consultivas" tone="blue" active={filters.categoriaGrupo === 'adequacao-duvida'} onClick={() => setCategoryGroup('adequacao-duvida')} /></MetricGrid>
      </section>
      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2"><div><h2 className="text-sm font-bold">Governança, ITIL e risco</h2><p className="mt-0.5 text-[10px] text-muted">Indicadores inferidos pelo sistema; o Excel original não é alterado.</p></div>{filters.governanca && <button className="btn-secondary px-2.5 py-1.5 text-[10px]" onClick={() => setFilters((current) => ({ ...current, governanca: '' }))}>× Limpar governança</button>}</div>
        <MetricGrid variant="compact">{governanceCards.map(([id, label, value, note, tone]) => <StatCard key={id} inferred label={label} value={value} note={note} tone={tone} active={filters.governanca === id} onClick={() => setGovernance(id)} />)}</MetricGrid>
      </section>
      <section className="card"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Aging de tickets abertos</h2><p className="mt-0.5 text-[10px] text-muted">Clique em uma faixa para filtrar.</p></div>{filters.aging && <button className="text-[10px] font-bold text-brand" onClick={() => setFilters((current) => ({ ...current, aging: '' }))}>Limpar</button>}</div><MetricGrid variant="aging" className="mt-2">{[['0–3 dias', visibleSummary.aging.zeroATres, '0-3'], ['4–7 dias', visibleSummary.aging.quatroASete, '4-7'], ['8–15 dias', visibleSummary.aging.oitoAQuinze, '8-15'], ['+15 dias', visibleSummary.aging.maisDeQuinze, '15+']].map(([label, value, aging]) => <button key={aging} onClick={() => setFilters((current) => ({ ...current, aging: current.aging === aging ? '' : aging }))} className={`min-h-[58px] rounded-lg border p-2.5 text-left transition hover:border-brand ${filters.aging === aging ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'bg-slate-50 dark:bg-slate-800'}`}><strong className="block text-xl leading-none">{value}</strong><span className="mt-0.5 block text-[10px] leading-3 text-muted">{label}</span></button>)}</MetricGrid></section>
      <TicketTable tickets={filtered} onSelect={setSelected} />
      <ChartsGrid tickets={filtered} onFilter={handleChartFilter} />
      <EisenhowerSection tickets={eisenhowerScope} active={filters.quadranteEisenhower} onSelect={(quadranteEisenhower) => setFilters((current) => ({ ...current, quadranteEisenhower }))} />
      <ParetoSection tickets={filtered} onFilter={handleParetoFilter} />
      <TicketModal ticket={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
