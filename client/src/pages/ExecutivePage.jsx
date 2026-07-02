import { useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import MetricGrid from '../components/MetricGrid'
import StatCard from '../components/StatCard'
import TicketModal from '../components/TicketModal'
import TicketTable from '../components/TicketTable'
import { useData } from '../context/DataContext'
import { normalize, riskSort } from '../utils/tickets'

const isProblem = (ticket) => normalize(ticket.categoria).includes('problema')
const isConsulting = (ticket) => normalize(ticket.categoria).includes('adequacao') || normalize(ticket.categoria).includes('duvida')
const categoryLabels = { todos: 'Todos', problema: 'Problema', consultivo: 'Adequação / Dúvida' }
const viewLabels = { todos: 'Todo o backlog', criticos: 'Críticos P1/P2', sla: 'SLA vencido', semAtualizacao: 'Sem atualização', externo: 'Dependência externa', fornecedor: 'Aguardando fornecedor', recorrentes: 'Possíveis recorrências' }

function rank(tickets, field, limit = 8) {
  const counts = new Map()
  tickets.forEach((ticket) => counts.set(ticket[field] || '(vazio)', (counts.get(ticket[field] || '(vazio)') || 0) + 1))
  return [...counts].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, limit)
}

function recurrenceGroups(tickets) {
  const groups = new Map()
  tickets.forEach((ticket) => {
    const key = ticket.recorrenciaChave
    if (!groups.has(key)) groups.set(key, { key, total: 0, abertos: 0, slaVencido: 0, servico: ticket.servico })
    const group = groups.get(key)
    group.total += 1
    if (ticket.estaAberto) group.abertos += 1
    if (ticket.estaAberto && ticket.situacaoSLA === 'Vencido') group.slaVencido += 1
  })
  return [...groups.values()].filter((group) => group.total >= 2).sort((a, b) => b.total - a.total || b.slaVencido - a.slaVencido)
}

function ProgressMetric({ label, value, total, tone, note }) {
  const percentage = total ? Math.round((value / total) * 100) : 0
  return <div><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold">{label}</p><p className="mt-1 text-[11px] text-muted">{note}</p></div><div className="text-right"><strong className="text-lg">{value}</strong><span className="ml-1 text-xs text-muted">({percentage}%)</span></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>
}

function RankingList({ title, subtitle, items }) {
  const max = items[0]?.total || 1
  return <section className="card"><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs text-muted">{subtitle}</p><div className="mt-5 space-y-3">{items.length ? items.map((item) => <div key={item.name}><div className="flex justify-between gap-3 text-xs"><span className="truncate font-semibold" title={item.name}>{item.name}</span><strong>{item.total}</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand" style={{ width: `${(item.total / max) * 100}%` }} /></div></div>) : <p className="text-sm text-muted">Sem dados no recorte atual.</p>}</div></section>
}

export default function ExecutivePage() {
  const { tickets, health } = useData()
  const [category, setCategory] = useState('todos')
  const [view, setView] = useState('todos')
  const [selected, setSelected] = useState(null)
  const open = useMemo(() => tickets.filter((ticket) => ticket.estaAberto), [tickets])
  const categoryScope = useMemo(() => open.filter((ticket) => category === 'todos' || (category === 'problema' ? isProblem(ticket) : isConsulting(ticket))), [open, category])
  const recurrences = useMemo(() => recurrenceGroups(categoryScope), [categoryScope])
  const recurringKeys = useMemo(() => new Set(recurrences.map((group) => group.key)), [recurrences])
  const metrics = useMemo(() => {
    const result = { critical: 0, doNow: 0, sla: 0, stale: 0, external: 0, externalCritical: 0, supplier: 0, ageTotal: 0, staleTotal: 0, externalStaleTotal: 0 }
    categoryScope.forEach((ticket) => {
      if (['P1', 'P2'].includes(ticket.prioridadeGerencial)) result.critical += 1
      if (ticket.quadranteEisenhower === 'Fazer agora') result.doNow += 1
      if (ticket.situacaoSLA === 'Vencido') result.sla += 1
      if (ticket.semAtualizacao) result.stale += 1
      if (ticket.dependenciaExterna) { result.external += 1; result.externalStaleTotal += ticket.tempoSemAtualizacaoDias; if (['P1', 'P2'].includes(ticket.prioridadeGerencial)) result.externalCritical += 1 }
      if (ticket.motivoEsperaInferido === 'Aguardando fornecedor') result.supplier += 1
      result.ageTotal += ticket.tempoEmAbertoDias
      result.staleTotal += ticket.tempoSemAtualizacaoDias
    })
    return { ...result, averageAge: categoryScope.length ? Math.round(result.ageTotal / categoryScope.length) : 0, averageStale: categoryScope.length ? Math.round(result.staleTotal / categoryScope.length) : 0, externalAverageStale: result.external ? Math.round(result.externalStaleTotal / result.external) : 0 }
  }, [categoryScope])
  const filtered = useMemo(() => categoryScope.filter((ticket) => {
    if (view === 'criticos') return ['P1', 'P2'].includes(ticket.prioridadeGerencial)
    if (view === 'sla') return ticket.situacaoSLA === 'Vencido'
    if (view === 'semAtualizacao') return ticket.semAtualizacao
    if (view === 'externo') return ticket.dependenciaExterna
    if (view === 'fornecedor') return ticket.motivoEsperaInferido === 'Aguardando fornecedor'
    if (view === 'recorrentes') return recurringKeys.has(ticket.recorrenciaChave)
    return true
  }).sort(riskSort), [categoryScope, recurringKeys, view])
  const topServices = useMemo(() => rank(categoryScope, 'servico'), [categoryScope])
  const topClients = useMemo(() => rank(categoryScope, 'clientePessoa'), [categoryScope])
  const topDepartments = useMemo(() => rank(categoryScope, 'departamento', 1), [categoryScope])
  const topExternalOwners = useMemo(() => rank(categoryScope.filter((ticket) => ticket.dependenciaExterna), 'responsavel', 6), [categoryScope])
  const topExternalSubjects = useMemo(() => rank(categoryScope.filter((ticket) => ticket.dependenciaExterna), 'assunto', 6), [categoryScope])
  const paretoStats = useMemo(() => ({
    clients: new Set(categoryScope.filter((ticket) => ticket.paretoCliente).map((ticket) => ticket.clientePessoa)).size,
    services: new Set(categoryScope.filter((ticket) => ticket.paretoServico).map((ticket) => ticket.servico)).size,
    categories: new Set(categoryScope.filter((ticket) => ticket.paretoCategoria).map((ticket) => ticket.categoria)).size
  }), [categoryScope])

  if (!health.hasCurrentFile) return <EmptyState />
  const chooseCategory = (next) => { setCategory(next); setView('todos') }
  const chooseView = (next) => setView((current) => current === next ? 'todos' : next)
  const concentration = topServices[0]?.name || topDepartments[0]?.name || 'não identificada'

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">Visão executiva</p><h1 className="mt-2 text-3xl font-extrabold">Diretoria</h1><p className="mt-2 text-sm text-muted">Governança do backlog, risco, SLA, recorrência e dependências inferidas.</p></div><div className="card px-5 py-3 text-right"><p className="text-[10px] font-bold uppercase text-muted">Backlog selecionado</p><strong className="text-2xl">{filtered.length}</strong><span className="ml-1 text-xs text-muted">de {open.length}</span></div></section>

      <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Recorte da diretoria</h2><p className="mt-1 text-xs text-muted">Todos os blocos e a tabela acompanham esta seleção.</p></div><div className="flex flex-wrap gap-2">{Object.entries(categoryLabels).map(([value, label]) => <button key={value} onClick={() => chooseCategory(value)} className={category === value ? 'btn-primary' : 'btn-secondary'}>{label}</button>)}</div></div><div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-muted">Filtros:</span><span className="badge bg-blue-100 text-blue-700">{categoryLabels[category]}</span><span className="badge bg-violet/15 text-purple-700">{viewLabels[view]}</span>{(category !== 'todos' || view !== 'todos') && <button className="font-bold text-brand" onClick={() => { setCategory('todos'); setView('todos') }}>Limpar recorte</button>}</div></section>

      <MetricGrid>
        <StatCard inferred label="Críticos P1/P2" value={metrics.critical} note="Impacto e urgência elevados" tone="red" active={view === 'criticos'} onClick={() => chooseView('criticos')} />
        <StatCard inferred label="SLA vencido" value={metrics.sla} note="Referência interna excedida" tone="red" active={view === 'sla'} onClick={() => chooseView('sla')} />
        <StatCard inferred label="Sem atualização" value={metrics.stale} note="Há pelo menos 3 dias" tone="amber" active={view === 'semAtualizacao'} onClick={() => chooseView('semAtualizacao')} />
        <StatCard inferred label="Dependência externa" value={metrics.external} note={`${metrics.externalCritical} crítico(s) com fornecedor`} tone="violet" active={view === 'externo'} onClick={() => chooseView('externo')} />
        <StatCard inferred label="Aguardando fornecedor" value={metrics.supplier} note="Motivo de espera inferido" tone="blue" active={view === 'fornecedor'} onClick={() => chooseView('fornecedor')} />
        <StatCard inferred label="Problemas recorrentes" value={recurrences.length} note="Grupos com 2 ou mais tickets" tone="slate" active={view === 'recorrentes'} onClick={() => chooseView('recorrentes')} />
      </MetricGrid>

      <section className="card border-indigo-200 bg-gradient-to-br from-white to-indigo-50 dark:from-slate-900 dark:to-slate-900"><div className="flex items-center gap-2"><h2 className="font-bold">Leitura executiva</h2><span className="cursor-help text-violet" title="Texto gerado automaticamente com base nos tickets do recorte.">ⓘ</span></div><div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200 lg:grid-cols-2"><p>• O backlog selecionado possui <strong>{categoryScope.length} tickets</strong>, sendo <strong>{metrics.critical} críticos ou de alta prioridade</strong>.</p><p>• <strong>{metrics.sla} tickets</strong> estão com SLA interno vencido.</p><p>• <strong>{metrics.stale} tickets</strong> estão sem atualização há pelo menos 3 dias.</p><p>• A maior concentração está em <strong>{concentration}</strong>.</p><p>• Há indício de dependência externa em <strong>{metrics.external} tickets</strong>.</p><p>• Foram encontrados <strong>{recurrences.length} agrupamentos</strong> com possível recorrência.</p></div></section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]"><div className="card"><h2 className="font-bold">Sinais do backlog</h2><p className="mt-1 text-xs text-muted">Percentuais sobre {categoryScope.length} ticket(s) abertos.</p><div className="mt-4 space-y-4"><ProgressMetric label="Criticidade P1/P2" value={metrics.critical} total={categoryScope.length} tone="bg-red-500" note="Prioridade gerencial inferida" /><ProgressMetric label="SLA vencido" value={metrics.sla} total={categoryScope.length} tone="bg-orange-500" note="Comparação com a referência P1–P4" /><ProgressMetric label="Dependência externa" value={metrics.external} total={categoryScope.length} tone="bg-violet" note="Responsável ou contexto externo" /></div></div><div className="card"><h2 className="font-bold">Idade e movimentação</h2><p className="mt-1 text-xs text-muted">Médias do backlog selecionado.</p><MetricGrid variant="mini" className="mt-4"><div className="min-h-[72px] rounded-xl bg-blue-50 p-3 dark:bg-blue-950/50"><p className="text-[10px] font-bold uppercase text-muted">Tempo em aberto</p><strong className="mt-1 block text-2xl leading-none">{metrics.averageAge}<span className="ml-1 text-xs">dias</span></strong></div><div className="min-h-[72px] rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40"><p className="text-[10px] font-bold uppercase text-muted">Sem atualização</p><strong className="mt-1 block text-2xl leading-none">{metrics.averageStale}<span className="ml-1 text-xs">dias</span></strong></div><div className="min-h-[72px] rounded-xl bg-violet/10 p-3"><p className="text-[10px] font-bold uppercase text-muted">Média externa</p><strong className="mt-1 block text-2xl leading-none">{metrics.externalAverageStale}<span className="ml-1 text-xs">dias</span></strong></div></MetricGrid></div></section>

      <section className="grid gap-5 xl:grid-cols-3"><RankingList title="Serviços mais impactados" subtitle="Maior volume de backlog no recorte." items={topServices} /><RankingList title="Responsáveis externos" subtitle="Tickets com dependência externa inferida." items={topExternalOwners} /><RankingList title="Assuntos ligados a fornecedor" subtitle="Tópicos mais frequentes com dependência externa." items={topExternalSubjects} /></section>

      <section className="card"><div><h2 className="font-bold">Top 10 possíveis problemas recorrentes</h2><p className="mt-1 text-xs text-muted">Agrupamento por serviço, categoria e palavras principais do assunto.</p></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-muted dark:bg-slate-800"><tr><th className="p-3">Chave inferida</th><th className="p-3">Serviço</th><th className="p-3">Tickets</th><th className="p-3">Em aberto</th><th className="p-3">SLA vencido</th></tr></thead><tbody className="divide-y dark:divide-slate-800">{recurrences.slice(0, 10).map((group) => <tr key={group.key}><td className="max-w-md p-3 font-semibold"><span className="block truncate" title={group.key}>{group.key}</span></td><td className="p-3">{group.servico}</td><td className="p-3 font-bold">{group.total}</td><td className="p-3">{group.abertos}</td><td className="p-3 text-red-600">{group.slaVencido}</td></tr>)}</tbody></table>{!recurrences.length && <p className="py-10 text-center text-sm text-muted">Nenhum agrupamento recorrente encontrado.</p>}</div></section>

      <section className="card border-indigo-200"><div className="flex items-center gap-2"><h2 className="font-bold">Leitura executiva por Eisenhower e Pareto</h2><span className="cursor-help text-violet" title="Indicadores calculados automaticamente sobre o recorte atual.">ⓘ</span></div><MetricGrid variant="aging" className="mt-3"><div className="min-h-[80px] rounded-xl bg-red-50 p-3 dark:bg-red-950/40"><p className="text-[10px] font-bold uppercase text-muted">Fazer agora</p><strong className="mt-1 block text-2xl leading-none">{metrics.doNow}</strong><span className="text-xs text-muted">{categoryScope.length ? ((metrics.doNow / categoryScope.length) * 100).toFixed(1) : 0}% do backlog</span></div><div className="min-h-[80px] rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40"><p className="text-[10px] font-bold uppercase text-muted">Clientes Pareto</p><strong className="mt-1 block text-2xl leading-none">{paretoStats.clients}</strong><span className="text-xs text-muted">concentram ~80%</span></div><div className="min-h-[80px] rounded-xl bg-violet/10 p-3"><p className="text-[10px] font-bold uppercase text-muted">Serviços Pareto</p><strong className="mt-1 block text-2xl leading-none">{paretoStats.services}</strong><span className="text-xs text-muted">grupos prioritários</span></div><div className="min-h-[80px] rounded-xl bg-amber-50 p-3 dark:bg-amber-950/40"><p className="text-[10px] font-bold uppercase text-muted">Categorias Pareto</p><strong className="mt-1 block text-2xl leading-none">{paretoStats.categories}</strong><span className="text-xs text-muted">maior concentração</span></div></MetricGrid><div className="mt-3 grid gap-3 text-sm leading-6 lg:grid-cols-2"><p>• Dos <strong>{categoryScope.length} tickets abertos</strong>, <strong>{metrics.doNow}</strong> estão no quadrante Fazer agora.</p><p>• O maior foco deve estar no serviço <strong>{topServices[0]?.name || 'não identificado'}</strong>, com {topServices[0]?.total || 0} ticket(s).</p><p>• O cliente com maior demanda é <strong>{topClients[0]?.name || 'não identificado'}</strong>, com {topClients[0]?.total || 0} ticket(s).</p><p>• Para reduzir maior volume, priorize os ofensores Pareto de cliente, serviço e categoria e os tickets Fazer agora.</p></div></section>
      <TicketTable compact presorted tickets={filtered} onSelect={setSelected} />
      <TicketModal ticket={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
