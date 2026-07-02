import { memo, useMemo } from 'react'
import { buildEisenhowerMatrix } from '../utils/management'

const MATRIX_CELLS = [
  { name: 'Planejar', context: 'Alta importância · Baixa urgência' },
  { name: 'Fazer agora', context: 'Alta importância · Alta urgência' },
  { name: 'Monitorar / baixa prioridade', context: 'Baixa importância · Baixa urgência' },
  { name: 'Delegar / tratar com controle', context: 'Baixa importância · Alta urgência' }
]

function QuadrantCard({ quadrant, context, active, onClick }) {
  const services = quadrant.servicos.map((item) => item.name).join(', ') || '—'
  const clients = quadrant.clientes.map((item) => item.name).join(', ') || '—'
  const metrics = [
    ['Priorizados', quadrant.priorizados],
    ['SLA vencido', quadrant.slaVencido],
    ['Sem atualização', quadrant.semAtualizacao],
    ['Tempo médio', `${quadrant.tempoMedio}d`]
  ]

  return (
    <button onClick={onClick} className={`group min-w-0 rounded-xl border p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${quadrant.tone} ${active ? 'ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-950' : ''}`}>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-muted md:hidden">{context}</p>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold leading-tight text-slate-900 dark:text-slate-100">{quadrant.name}</h3>
          <span className="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-semibold text-muted dark:bg-slate-900/50">{quadrant.percentual}% do backlog</span>
        </div>
        <div className="shrink-0 text-right">
          <strong className="block text-3xl font-extrabold leading-none text-slate-900 dark:text-white">{quadrant.total}</strong>
          <span className="text-[8px] font-bold uppercase tracking-wide text-muted">tickets</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/80 bg-white/65 px-2 py-1.5 text-center dark:border-slate-700/70 dark:bg-slate-900/45">
            <strong className="block text-sm leading-none text-slate-900 dark:text-slate-100">{value}</strong>
            <span className="mt-1 block truncate text-[8px] font-semibold uppercase tracking-wide text-muted" title={label}>{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid gap-2 border-t border-slate-900/10 pt-2.5 text-[9px] dark:border-white/10 sm:grid-cols-2">
        <div className="min-w-0"><span className="block font-bold uppercase tracking-wide text-muted">Serviços em destaque</span><p className="mt-0.5 truncate font-semibold text-slate-700 dark:text-slate-200" title={services}>{services}</p></div>
        <div className="min-w-0"><span className="block font-bold uppercase tracking-wide text-muted">Clientes em destaque</span><p className="mt-0.5 truncate font-semibold text-slate-700 dark:text-slate-200" title={clients}>{clients}</p></div>
      </div>
    </button>
  )
}

function AxisLabel({ level }) {
  return (
    <div className="flex flex-col items-end justify-center rounded-lg bg-slate-50 px-2.5 text-right dark:bg-slate-800">
      <strong className="text-xs text-slate-700 dark:text-slate-200">{level}</strong>
      <span className="text-[8px] font-bold uppercase tracking-wide text-muted">importância</span>
    </div>
  )
}

function EisenhowerSection({ tickets, active, onSelect }) {
  const quadrants = useMemo(() => buildEisenhowerMatrix(tickets), [tickets])
  const byName = Object.fromEntries(quadrants.map((quadrant) => [quadrant.name, quadrant]))
  const cells = MATRIX_CELLS.map((cell) => ({ ...cell, quadrant: byName[cell.name] }))
  const select = (name) => onSelect(active === name ? '' : name)

  return <section className="space-y-2">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><div className="flex items-center gap-2"><h2 className="text-sm font-bold">Matriz de Eisenhower</h2><span className="cursor-help text-xs text-violet" title="Classificação inferida a partir de urgência, importância, SLA, risco, impacto e Pareto.">ⓘ</span></div><p className="mt-0.5 text-[10px] text-muted">Priorize visualmente o backlog pela combinação entre importância e urgência.</p></div>
      {active && <button className="btn-secondary px-3 py-1.5 text-[10px]" onClick={() => onSelect('')}>× Limpar quadrante</button>}
    </div>

    <div className="card">
      <div className="hidden grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)] gap-2 md:grid">
        <div className="flex items-end justify-end px-2 pb-1 text-[8px] font-bold uppercase tracking-wide text-muted">Importância ↓</div>
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center dark:bg-slate-800"><strong className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-300">Baixa urgência</strong></div>
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center dark:bg-slate-800"><strong className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-300">Alta urgência</strong></div>

        <AxisLabel level="Alta" />
        <QuadrantCard quadrant={cells[0].quadrant} context={cells[0].context} active={active === cells[0].name} onClick={() => select(cells[0].name)} />
        <QuadrantCard quadrant={cells[1].quadrant} context={cells[1].context} active={active === cells[1].name} onClick={() => select(cells[1].name)} />

        <AxisLabel level="Baixa" />
        <QuadrantCard quadrant={cells[2].quadrant} context={cells[2].context} active={active === cells[2].name} onClick={() => select(cells[2].name)} />
        <QuadrantCard quadrant={cells[3].quadrant} context={cells[3].context} active={active === cells[3].name} onClick={() => select(cells[3].name)} />
      </div>

      <div className="grid gap-2 md:hidden">
        {cells.map((cell) => <QuadrantCard key={cell.name} quadrant={cell.quadrant} context={cell.context} active={active === cell.name} onClick={() => select(cell.name)} />)}
      </div>
    </div>
  </section>
}

export default memo(EisenhowerSection)
