import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { aggregate } from '../utils/tickets'

const COLORS = ['#4f6df5', '#9b7cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#64748b']

function ChartCard({ title, subtitle, children }) {
  return <div className="card min-h-[236px]"><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-[10px] text-muted">{subtitle}</p></div><div className="mt-2 h-44">{children}</div></div>
}

function EmptyChart() {
  return <div className="grid h-full place-items-center text-sm text-muted">Sem dados para exibir.</div>
}

function BarView({ data, onClick, color = '#4f6df5' }) {
  if (!data.length) return <EmptyChart />
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -20, right: 5, top: 5, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-22} textAnchor="end" interval="preserveStartEnd" minTickGap={24} height={55} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
        <Tooltip cursor={{ fill: '#eef2ff' }} />
        <Bar dataKey="total" fill={color} radius={[7, 7, 0, 0]} cursor="pointer" isAnimationActive={false} onClick={(entry) => onClick?.(entry.name)} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartsGrid({ tickets, onFilter }) {
  const { monthly, departments, statuses, categories, clients } = useMemo(() => ({
    monthly: aggregate(tickets, 'mesAno').filter((item) => item.name !== '(vazio)').sort((a, b) => a.name.localeCompare(b.name)),
    departments: aggregate(tickets, 'departamento', false, 8),
    statuses: aggregate(tickets, 'status'),
    categories: aggregate(tickets, 'categoria'),
    clients: aggregate(tickets, 'clientePessoa', true, 8)
  }), [tickets])
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ChartCard title="Evolução de tickets por mês" subtitle="Clique em uma barra para filtrar o período.">
        <BarView data={monthly} onClick={(name) => { const [ano, mes] = name.split('-'); onFilter({ ano, mes: String(Number(mes)) }) }} />
      </ChartCard>
      <ChartCard title="Tickets por departamento" subtitle="Distribuição da base filtrada.">
        <BarView data={departments} color="#9b7cf6" onClick={(departamento) => onFilter({ departamento })} />
      </ChartCard>
      <ChartCard title="Tickets por status" subtitle="Clique em uma fatia para aplicar o status.">
        {!statuses.length ? <EmptyChart /> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statuses} dataKey="total" nameKey="name" innerRadius={42} outerRadius={75} paddingAngle={2} isAnimationActive={false} onClick={(entry) => onFilter({ status: entry.name })} cursor="pointer">{statuses.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>}
      </ChartCard>
      <ChartCard title="Tickets por categoria" subtitle="Composição das categorias da base.">
        <BarView data={categories} color="#22c55e" onClick={(categoria) => onFilter({ categoria })} />
      </ChartCard>
      <div className="xl:col-span-2"><ChartCard title="Top 8 clientes em aberto" subtitle="Clientes com maior backlog aberto."><BarView data={clients} color="#f59e0b" onClick={(clientePessoa) => onFilter({ clientePessoa, somenteAberto: true })} /></ChartCard></div>
    </div>
  )
}

export default memo(ChartsGrid)
