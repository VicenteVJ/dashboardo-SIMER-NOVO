import { memo, useMemo } from 'react'
import { buildEisenhowerMatrix } from '../utils/management'

function QuadrantContent({ quadrant }) {
  return <>
    <div className="flex items-start justify-between gap-2">
      <div><h3 className="text-xs font-extrabold leading-tight">{quadrant.name}</h3><p className="mt-0.5 text-[10px] text-muted">{quadrant.percentual}% do backlog</p></div>
      <strong className="text-2xl leading-none">{quadrant.total}</strong>
    </div>
    <div className="mt-2 grid grid-cols-3 gap-1 text-center">
      <div><strong className="block text-xs">{quadrant.priorizados}</strong><span className="text-[8px] uppercase text-muted">Prioriz.</span></div>
      <div><strong className="block text-xs">{quadrant.slaVencido}</strong><span className="text-[8px] uppercase text-muted">SLA</span></div>
      <div><strong className="block text-xs">{quadrant.semAtualizacao}</strong><span className="text-[8px] uppercase text-muted">Parados</span></div>
    </div>
  </>
}

function EisenhowerSection({ tickets, active, onSelect }) {
  const quadrants = useMemo(() => buildEisenhowerMatrix(tickets), [tickets])
  const byName = Object.fromEntries(quadrants.map((quadrant) => [quadrant.name, quadrant]))
  const matrixOrder = [byName.Planejar, byName['Fazer agora'], byName['Monitorar / baixa prioridade'], byName['Delegar / tratar com controle']]
  const select = (name) => onSelect(active === name ? '' : name)
  return <section className="space-y-2">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><div className="flex items-center gap-2"><h2 className="text-sm font-bold">Matriz de Eisenhower</h2><span className="cursor-help text-xs text-violet" title="Classificação inferida a partir de urgência, importância, SLA, risco, impacto e Pareto.">ⓘ</span></div><p className="mt-0.5 text-[10px] text-muted">Urgência define pressão de tempo; importância considera impacto, criticidade, recorrência e concentração 80/20.</p></div>
      {active && <button className="btn-secondary px-3 py-1.5 text-[10px]" onClick={() => onSelect('')}>× Limpar quadrante</button>}
    </div>
    <div className="card relative max-w-[1060px] pt-5">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold uppercase tracking-wider text-muted">Importante →</span>
      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-muted">Urgente →</span>
      <div className="ml-4 grid gap-1.5 pb-2 md:grid-cols-2">
        {matrixOrder.map((quadrant) => <button key={quadrant.name} onClick={() => select(quadrant.name)} className={`min-h-[104px] rounded-lg border p-2.5 text-left transition hover:border-brand ${quadrant.tone} ${active === quadrant.name ? 'ring-2 ring-brand ring-offset-1 dark:ring-offset-slate-950' : ''}`}><QuadrantContent quadrant={quadrant} /><div className="mt-1.5 grid gap-0.5 text-[9px] leading-3.5 text-muted sm:grid-cols-2"><p><strong>Serviços:</strong> {quadrant.servicos.map((item) => item.name).join(', ') || '—'}</p><p><strong>Clientes:</strong> {quadrant.clientes.map((item) => item.name).join(', ') || '—'}</p><p className="sm:col-span-2"><strong>Tempo médio:</strong> {quadrant.tempoMedio} dias</p></div></button>)}
      </div>
    </div>
  </section>
}

export default memo(EisenhowerSection)
