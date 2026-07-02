import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import MetricGrid from '../components/MetricGrid'
import StatCard from '../components/StatCard'
import { useData } from '../context/DataContext'
import { formatDate, movideskTicketUrl, statusTone } from '../utils/tickets'

const TYPE_META = {
  novo: { label: 'Novo', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  removido: { label: 'Removido', badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  alterado: { label: 'Alterado', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' }
}

const SNAPSHOT_FIELDS = [
  ['assunto', 'Assunto'], ['status', 'Status'], ['abertoEm', 'Aberto em'], ['ultimaAcao', 'Última ação'],
  ['clientePessoa', 'Cliente'], ['departamento', 'Departamento'], ['servico', 'Serviço'],
  ['responsavel', 'Responsável'], ['categoria', 'Categoria'], ['ticketPriorizado', 'Priorizado'],
  ['tempoEmAbertoDias', 'Tempo em aberto'], ['statusGerencial', 'Status gerencial'], ['tipoITIL', 'Tipo ITIL'],
  ['prioridadeGerencial', 'Prioridade gerencial'], ['situacaoSLA', 'Situação SLA'], ['nivelRisco', 'Nível de risco'],
  ['scoreRisco', 'Score de risco'], ['dependenciaExterna', 'Dependência externa'], ['semAtualizacao', 'Sem atualização'],
  ['quadranteEisenhower', 'Quadrante Eisenhower'], ['urgente', 'Urgente'], ['importante', 'Importante'],
  ['grupoParetoPrincipal', 'Grupo Pareto principal'], ['pesoPareto', 'Peso Pareto']
]

function displayValue(field, value) {
  if (['ticketPriorizado', 'dependenciaExterna', 'semAtualizacao', 'urgente', 'importante'].includes(field)) return value ? 'Sim' : 'Não'
  if (field === 'abertoEm' || field === 'ultimaAcao') return formatDate(value)
  if (field === 'tempoEmAbertoDias') return value == null ? '—' : `${value} dias`
  if (value == null || value === '') return '—'
  return String(value)
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || { label: type, badge: 'bg-slate-100 text-slate-700' }
  return <span className={`badge uppercase ${meta.badge}`}>{meta.label}</span>
}

function SnapshotCard({ title, ticket }) {
  return (
    <section className="rounded-2xl border border-indigo-200 p-4 dark:border-slate-700">
      <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{title}</h3>
      {ticket ? <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {SNAPSHOT_FIELDS.map(([field, label]) => <div key={field} className={field === 'assunto' ? 'sm:col-span-2' : ''}><p className="text-[10px] font-bold uppercase text-muted">{label}</p><p className="mt-1 break-words text-xs font-semibold">{displayValue(field, ticket[field])}</p></div>)}
      </div> : <p className="mt-4 text-sm text-muted">O ticket não existe nesta planilha.</p>}
    </section>
  )
}

function ChangeValues({ item, side }) {
  if (item.changes?.length) {
    return <div className="space-y-2">{item.changes.map((change) => <div key={change.field} className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-800"><p className="text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-300">{change.label}</p><p className="mt-1 break-words text-xs font-semibold">{displayValue(change.field, change[side])}</p></div>)}</div>
  }
  const ticket = side === 'before' ? item.before : item.after
  if (!ticket) return <span className="text-muted">—</span>
  return <div className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-800"><p className="line-clamp-2 text-xs font-semibold">{ticket.assunto}</p><p className="mt-1 text-[11px] text-muted">{ticket.status} · {ticket.clientePessoa}</p></div>
}

function comparisonSummary(item) {
  const ticket = item.after || item.before
  const lines = [`Ticket #${item.numero}`, `Tipo: ${TYPE_META[item.type]?.label || item.type}`, `Assunto: ${ticket?.assunto || '—'}`]
  if (item.changes?.length) {
    lines.push('', 'Alterações:')
    item.changes.forEach((change) => lines.push(`- ${change.label}: ${displayValue(change.field, change.before)} → ${displayValue(change.field, change.after)}`))
  }
  return lines.join('\n')
}

function ComparisonModal({ item, onClose, onMessage }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  if (!item) return null
  const ticket = item.after || item.before
  const copy = async () => {
    try { await navigator.clipboard.writeText(comparisonSummary(item)); onMessage({ type: 'success', text: 'Resumo da comparação copiado.' }) }
    catch { onMessage({ type: 'error', text: 'O navegador não permitiu copiar o resumo.' }) }
  }
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div><h2 className="text-lg font-extrabold">{ticket?.assunto || `Ticket #${item.numero}`}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-brand">Ticket #{item.numero}</span><span className="text-muted">•</span><TypeBadge type={item.type} />{ticket?.status && <><span className="text-muted">•</span><span className={`badge ${statusTone(ticket.status)}`}>{ticket.status}</span></>}</div></div>
          <button aria-label="Fechar" className="rounded-xl border px-3 py-1.5 text-xl text-muted hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onClose}>×</button>
        </header>
        <div className="thin-scrollbar space-y-3 overflow-y-auto p-4">
          <SnapshotCard title="Snapshot — Excel velho" ticket={item.before} />
          <SnapshotCard title="Snapshot — Excel novo" ticket={item.after} />
          <section className="rounded-2xl border border-indigo-200 bg-blue-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Alterações detectadas</h3>
            {item.changes?.length ? <><p className="mt-2 text-xs font-semibold">Total de campos alterados: {item.changes.length}</p><div className="mt-3 overflow-x-auto rounded-xl border"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-blue-100/70 text-[10px] uppercase text-muted dark:bg-slate-700"><tr><th className="p-3">Campo</th><th className="p-3">Antes</th><th className="p-3">Depois</th></tr></thead><tbody className="divide-y">{item.changes.map((change) => <tr key={change.field}><td className="p-3 font-bold">{change.label}</td><td className="p-3">{displayValue(change.field, change.before)}</td><td className="p-3 font-semibold">{displayValue(change.field, change.after)}</td></tr>)}</tbody></table></div></> : <p className="mt-3 text-sm text-muted">{item.type === 'novo' ? 'Ticket incluído no Excel novo.' : 'Ticket presente somente no Excel velho.'}</p>}
          </section>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t p-4"><button className="btn-secondary" onClick={copy}>Copiar resumo</button><Link className="btn-secondary" to={`/ticket?numero=${encodeURIComponent(item.numero)}`}>Abrir na aba Ticket</Link><a className="btn-primary" href={movideskTicketUrl(item.numero)} target="_blank" rel="noreferrer">Ver no Movidesk ↗</a></footer>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const { setMessage } = useData()
  const [oldFile, setOldFile] = useState(null)
  const [newFile, setNewFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('all')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 30

  const compare = async () => {
    if (!oldFile || !newFile) return setMessage({ type: 'error', text: 'Selecione os dois arquivos Excel.' })
    setLoading(true)
    try {
      const comparison = await api.compare(oldFile, newFile)
      setResult(comparison)
      setView('all')
      setMessage({ type: 'success', text: 'Comparação concluída.' })
    } catch (error) { setMessage({ type: 'error', text: error.message }) }
    finally { setLoading(false) }
  }

  const items = useMemo(() => view === 'all' ? result?.all || [] : (result?.all || []).filter((item) => item.type === view || item.governanceImpacts?.includes(view)), [result, view])
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const visibleItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page])
  useEffect(() => setPage(1), [view, result])

  return (
    <div className="space-y-4">
      <section><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-brand">Análise de mudança</p><h1 className="mt-1 text-2xl font-extrabold">Comparar Excel <span className="text-base font-semibold text-muted">(antigo vs. novo)</span></h1><p className="mt-1 text-xs text-muted">Identifique novos tickets, remoções e alterações entre duas extrações.</p></section>

      <section className="card">
        <div className="grid items-end gap-3 lg:grid-cols-[1fr_1fr_auto]">
          {[['Excel velho', oldFile, setOldFile], ['Excel novo', newFile, setNewFile]].map(([label, file, setter]) => <label key={label} className="field flex cursor-pointer items-center gap-3 py-3 font-bold hover:border-brand"><span>↥</span><span className="min-w-0 flex-1"><span className="block">{label}</span><span className="block truncate text-[11px] font-normal text-muted">{file?.name || 'Selecionar arquivo .xlsx'}</span></span><input className="hidden" type="file" accept=".xlsx" onChange={(event) => setter(event.target.files?.[0] || null)} /></label>)}
          <button className="btn-primary h-10" disabled={loading || !oldFile || !newFile} onClick={compare}>{loading ? 'Comparando…' : 'Comparar'}</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><a className={`btn-secondary ${!result ? 'pointer-events-none opacity-50' : ''}`} href={api.exportUrl('/api/export/comparison')}>↓ Exportar alterações (CSV)</a><Link className="btn-secondary" to="/">← Voltar ao Painel</Link></div>
      </section>

      {result && <>
        <MetricGrid>
          <StatCard label="Novos tickets" value={result.counts.novos} note="Existe só no novo" tone="green" active={view === 'novo'} onClick={() => setView('novo')} />
          <StatCard label="Tickets removidos" value={result.counts.removidos} note="Existe só no velho" tone="red" active={view === 'removido'} onClick={() => setView('removido')} />
          <StatCard label="Tickets alterados" value={result.counts.alterados} note="Mesmo número, campos mudaram" tone="amber" active={view === 'alterado'} onClick={() => setView('alterado')} />
          <StatCard label="Total comparado" value={result.counts.totalComparado} note="União entre velho e novo" tone="blue" active={view === 'all'} onClick={() => setView('all')} />
          <StatCard label="Ver somente alterados" value="⇄" note="Aplicar filtro" tone="amber" active={view === 'alterado'} onClick={() => setView('alterado')} />
          <StatCard label="Ver tudo" value="∞" note="Remover filtro de tipo" tone="blue" active={view === 'all'} onClick={() => setView('all')} />
        </MetricGrid>
        <section><div className="mb-3"><h2 className="font-bold">Impacto gerencial da mudança</h2><p className="mt-1 text-xs text-muted">Classificações inferidas pelo sistema nos dois snapshots.</p></div><MetricGrid variant="compact"><StatCard inferred label="Novos críticos" value={result.counts.novosCriticos} note="Novo P1/P2 ou risco crítico" tone="red" active={view === 'novo-critico'} onClick={() => setView('novo-critico')} /><StatCard inferred label="Pioraram risco" value={result.counts.pioraramRisco} note="Score aumentou no novo" tone="red" active={view === 'piorou-risco'} onClick={() => setView('piorou-risco')} /><StatCard inferred label="Melhoraram risco" value={result.counts.melhoraramRisco} note="Score diminuiu no novo" tone="green" active={view === 'melhorou-risco'} onClick={() => setView('melhorou-risco')} /><StatCard inferred label="Venceram SLA" value={result.counts.venceramSLA} note="Passaram para vencido" tone="amber" active={view === 'venceu-sla'} onClick={() => setView('venceu-sla')} /><StatCard inferred label="Saíram de aguardando" value={result.counts.sairamAguardando} note="Deixaram o estado de espera" tone="blue" active={view === 'saiu-aguardando'} onClick={() => setView('saiu-aguardando')} /><StatCard inferred label="Resolvidos no novo" value={result.counts.resolvidosNoNovo} note="Passaram para encerrado" tone="green" active={view === 'resolvido'} onClick={() => setView('resolvido')} /></MetricGrid></section>

        <section className="card overflow-hidden p-0">
          <div className="border-b px-5 py-4"><h2 className="font-bold">Alterações detectadas</h2><p className="mt-1 text-xs text-muted">{items.length} resultado(s). Clique em uma linha para abrir os snapshots completos.</p></div>
          <div className="thin-scrollbar max-h-[720px] overflow-auto p-3">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase text-muted dark:bg-slate-800"><tr><th className="p-3">Número</th><th className="p-3">Tipo</th><th className="w-[38%] p-3">Antes</th><th className="w-[38%] p-3">Depois</th></tr></thead>
              <tbody className="divide-y dark:divide-slate-800">{visibleItems.map((item) => <tr key={`${item.type}-${item.numero}`} className="cursor-pointer align-top hover:bg-blue-50 dark:hover:bg-slate-800" onClick={() => setSelected(item)}><td className="p-3 font-bold text-brand">#{item.numero}</td><td className="p-3"><TypeBadge type={item.type} /><p className="mt-2 text-[11px] font-semibold text-muted">{item.changes?.length || 0} campo(s)</p></td><td className="p-3"><ChangeValues item={item} side="before" /></td><td className="p-3"><ChangeValues item={item} side="after" /></td></tr>)}</tbody>
            </table>
            {!items.length && <p className="py-14 text-center text-sm text-muted">Nenhuma alteração nesta categoria.</p>}
          </div>
          {items.length > pageSize && <div className="flex items-center justify-between border-t px-5 py-4 text-xs text-muted"><span>Página {page} de {totalPages}</span><div className="flex gap-2"><button className="btn-secondary px-3 py-2" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button className="btn-secondary px-3 py-2" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>}
        </section>
      </>}

      {selected && <ComparisonModal item={selected} onClose={() => setSelected(null)} onMessage={setMessage} />}
    </div>
  )
}
