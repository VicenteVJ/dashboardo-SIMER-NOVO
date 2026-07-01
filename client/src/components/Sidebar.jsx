import { NavLink } from 'react-router-dom'
import { useData } from '../context/DataContext'
import simerLogo from '../assets/simer-logo.svg'

const navigation = [
  ['/', '▦', 'Painel'],
  ['/diretoria', '◫', 'Diretoria'],
  ['/comparar', '⇄', 'Comparar Excel'],
  ['/ticket', '#', 'Ticket']
]

export default function Sidebar({ open, onClose }) {
  const { summary, prioritized } = useData()
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col overflow-hidden bg-slate-950 px-3.5 py-4 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <button className="absolute right-4 top-4 text-2xl text-slate-400 lg:hidden" onClick={onClose}>×</button>
      <div className="rounded-xl bg-gradient-to-br from-brand to-violet p-3.5 shadow-lg">
        <img src={simerLogo} alt="ERP Simer" className="h-8 w-auto max-w-full" />
        <h1 className="mt-2.5 text-base font-extrabold leading-tight">Dashboard de Chamados</h1>
        <p className="mt-1.5 text-[10px] leading-4 text-white/75">Volume, backlog, SLA, prioridade e tendência.</p>
      </div>

      <nav className="mt-4 space-y-1">
        {navigation.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose} className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
            <span className="w-4 text-center text-base">{icon}</span>{label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4">
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Resumo operacional</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[
            ['Em aberto', summary.emAberto, 'text-blue-300'],
            ['Aguardando', summary.aguardandoRetorno, 'text-amber-300'],
            ['Priorizados', summary.priorizadosAbertos, 'text-violet-300'],
            ['Fora do prazo', summary.foraDoPrazo, 'text-red-300']
          ].map(([label, value, tone]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <strong className={`block text-base ${tone}`}>{value}</strong>
              <span className="text-[9px] leading-tight text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-500">Priorizados abertos</p>
        <div className="thin-scrollbar mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {prioritized.length ? prioritized.map((ticket) => (
            <NavLink to={`/ticket?numero=${encodeURIComponent(ticket.numero)}`} key={ticket.numero} className="block rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-xs text-blue-300">#{ticket.numero}</strong>
                <span className="text-[10px] text-slate-400">{ticket.tempoEmAbertoDias}d</span>
              </div>
              <p className="mt-0.5 truncate text-[10px] font-medium">{ticket.assunto}</p>
              <p className="mt-1 truncate text-[10px] text-slate-400">{ticket.clientePessoa} · {ticket.status}</p>
              <div className="mt-1 flex gap-1">
                <span className="rounded bg-violet/20 px-1.5 py-0.5 text-[9px] text-violet-200">Prior.</span>
                {ticket.foraDoPrazo && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-200">SLA</span>}
              </div>
            </NavLink>
          )) : <p className="text-xs text-slate-500">Nenhum ticket priorizado.</p>}
        </div>
      </div>
    </aside>
  )
}
