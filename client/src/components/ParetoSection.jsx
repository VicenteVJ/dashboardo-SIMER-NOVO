import { memo, useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { buildParetoView, PARETO_VIEW_DIMENSIONS } from '../utils/management'

function ParetoSection({ tickets, onFilter }) {
  const [dimension, setDimension] = useState('cliente')
  const analyses = useMemo(() => Object.fromEntries(Object.keys(PARETO_VIEW_DIMENSIONS).map((key) => [key, buildParetoView(tickets, key)])), [tickets])
  const selected = analyses[dimension]
  const top = selected.all[0]
  const category = analyses.categoria.all[0]
  const focus = [analyses.cliente.all[0]?.name, analyses.servico.all[0]?.name, analyses.categoria.all[0]?.name].filter(Boolean).join(', ')
  return <section className="space-y-2">
    <div><div className="flex items-center gap-2"><h2 className="text-sm font-bold">Análise de Pareto 80/20</h2><span className="cursor-help text-xs text-violet" title="Grupos ordenados por volume; o conjunto Pareto inclui os ofensores até atingir aproximadamente 80% do backlog.">ⓘ</span></div><p className="mt-0.5 text-[10px] text-muted">Grupos que concentram a maior parte do backlog e demandam atenção gerencial.</p></div>
    <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Pareto por {PARETO_VIEW_DIMENSIONS[dimension].label.toLowerCase()}</h3><p className="mt-0.5 text-[10px] text-muted">Barras: tickets · Linha: percentual acumulado.</p></div><div className="flex flex-wrap gap-1">{Object.entries(PARETO_VIEW_DIMENSIONS).map(([key, config]) => <button key={key} onClick={() => setDimension(key)} className={dimension === key ? 'btn-primary px-2.5 py-1.5 text-[10px]' : 'btn-secondary px-2.5 py-1.5 text-[10px]'}>{config.label}</button>)}</div></div>
        <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={selected.chart} margin={{ left: -15, right: -5, bottom: 40 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 8 }} height={58} /><YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 8 }} /><YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 8 }} /><Tooltip formatter={(value, name) => [name === 'acumulado' ? `${value}%` : value, name === 'acumulado' ? 'Acumulado' : 'Tickets']} /><ReferenceLine yAxisId="percent" y={80} stroke="#ef4444" strokeDasharray="5 5" /><Bar yAxisId="count" dataKey="total" isAnimationActive={false} cursor="pointer" onClick={(entry) => onFilter(PARETO_VIEW_DIMENSIONS[dimension].field, entry.name)}>{selected.chart.map((entry) => <Cell key={entry.name} fill={entry.pareto ? '#4f6df5' : '#cbd5e1'} />)}</Bar><Line yAxisId="percent" type="monotone" dataKey="acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div>
      </div>
      <div className="card"><h3 className="text-sm font-bold">Leitura automática</h3><div className="mt-2 space-y-1.5 text-xs leading-4 text-slate-700 dark:text-slate-200"><p>• Os <strong>{selected.paretoGroups.length} principais {PARETO_VIEW_DIMENSIONS[dimension].label.toLowerCase()}</strong> concentram aproximadamente 80% dos {selected.totalBacklog} tickets abertos.</p><p>• <strong>{top?.name || '—'}</strong> representa {top?.percentual || 0}% do backlog nesta dimensão.</p><p>• A categoria <strong>{category?.name || '—'}</strong> possui {category?.slaVencido || 0} ticket(s) com SLA vencido.</p><p>• As maiores oportunidades estão em <strong>{focus || 'grupos ainda não identificados'}</strong>.</p></div><div className="mt-2 rounded-lg bg-blue-50 p-2.5 text-[10px] leading-4 text-blue-800 dark:bg-blue-950 dark:text-blue-200">Azul pertence ao conjunto Pareto; cinza representa a cauda de menor concentração.</div></div>
    </div>
  </section>
}

export default memo(ParetoSection)
