import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { ticketSummary } from '../components/TicketModal'
import { useData } from '../context/DataContext'
import { formatDate, movideskTicketUrl, priorityTone, riskTone, slaTone, statusTone } from '../utils/tickets'

export default function TicketPage() {
  const [params, setParams] = useSearchParams()
  const { setMessage } = useData()
  const [number, setNumber] = useState(params.get('numero') || '')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const search = async (target = number) => {
    if (!String(target).trim()) return
    setLoading(true)
    try { const found = await api.ticket(String(target).trim()); setTicket(found); setParams({ numero: found.numero }) }
    catch (error) { setTicket(null); setMessage({ type: 'error', text: error.message }) }
    finally { setLoading(false) }
  }
  useEffect(() => { const initial = params.get('numero'); if (initial) search(initial) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const fields = ticket ? [['Número', `#${ticket.numero}`], ['Status', ticket.status], ['Assunto', ticket.assunto], ['Aberto em', formatDate(ticket.abertoEm)], ['Departamento', ticket.departamento], ['Solicitante', ticket.usuarioSolicitante], ['Cliente', ticket.clientePessoa], ['Serviço', ticket.servico], ['Responsável', ticket.responsavel], ['Categoria', ticket.categoria], ['Última ação', formatDate(ticket.ultimaAcao)], ['Tempo em aberto', `${ticket.tempoEmAbertoDias} dias`], ['Priorizado', ticket.ticketPriorizado ? 'Sim' : 'Não']] : []
  const governance = ticket ? [['Status gerencial', ticket.statusGerencial], ['Tipo ITIL', ticket.tipoITIL], ['Prioridade gerencial', ticket.prioridadeGerencial], ['Impacto', ticket.impactoEstimado], ['Urgência', ticket.urgenciaEstimada], ['Score / risco', `${ticket.scoreRisco} · ${ticket.nivelRisco}`], ['Situação SLA', ticket.situacaoSLA], ['SLA referência', `${ticket.slaDiasReferencia ?? '—'} dias`], ['Sem atualização', `${ticket.tempoSemAtualizacaoDias} dias`], ['Responsável gerencial', ticket.responsavelGerencial], ['Dependência externa', ticket.dependenciaExterna ? 'Sim' : 'Não'], ['Motivo de espera', ticket.motivoEsperaInferido], ['Quadrante Eisenhower', ticket.quadranteEisenhower], ['Urgente / importante', `${ticket.urgente ? 'Sim' : 'Não'} / ${ticket.importante ? 'Sim' : 'Não'}`], ['Motivos de urgência', ticket.motivoUrgencia?.join(', ') || 'Nenhum'], ['Motivos de importância', ticket.motivoImportancia?.join(', ') || 'Nenhum'], ['Ação recomendada', ticket.acaoRecomendada], ['Peso / grupo Pareto', `${ticket.pesoPareto} · ${ticket.grupoParetoPrincipal}`]] : []
  const copy = async () => { try { await navigator.clipboard.writeText(ticketSummary(ticket)); setMessage({ type: 'success', text: 'Resumo copiado.' }) } catch { setMessage({ type: 'error', text: 'Não foi possível copiar.' }) } }
  return (
    <div className="space-y-4">
      <section><p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand">Consulta individual</p><h1 className="mt-2 text-3xl font-extrabold">Buscar ticket</h1><p className="mt-2 text-sm text-muted">Localize um chamado pelo número exato.</p></section>
      <div className="card flex flex-col gap-3 sm:flex-row"><input className="field flex-1" placeholder="Digite o número do ticket" value={number} onChange={(event) => setNumber(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} /><button className="btn-primary" disabled={loading || !number.trim()} onClick={() => search()}>{loading ? 'Buscando…' : 'Buscar'}</button><Link to="/" className="btn-secondary">Voltar ao painel</Link></div>
      {ticket && <><div className="card"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`badge ${statusTone(ticket.status)}`}>{ticket.status}</span><h2 className="mt-3 text-2xl font-extrabold">{ticket.assunto}</h2></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={copy}>Copiar resumo</button><a className="btn-primary" href={movideskTicketUrl(ticket.numero)} target="_blank" rel="noreferrer">Ver no Movidesk ↗</a></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase text-muted">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>)}</div></div><section className="card border-indigo-200 bg-indigo-50/40 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">Governança</h2><p className="mt-1 text-xs text-muted">Classificações inferidas pelo sistema a partir do Excel.</p></div><div className="flex gap-2"><span className={`badge ${priorityTone(ticket.prioridadeGerencial)}`}>{ticket.prioridadeGerencial}</span><span className={`badge ${riskTone(ticket.nivelRisco)}`}>{ticket.nivelRisco}</span><span className={`badge ${slaTone(ticket.situacaoSLA)}`}>{ticket.situacaoSLA}</span></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{governance.map(([label, value]) => <div key={label} className="rounded-xl bg-white p-4 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase text-muted">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{ticket.qualidadeDados?.length ? ticket.qualidadeDados.map((alert) => <span key={alert} className="badge bg-red-100 text-red-700">{alert}</span>) : <span className="badge bg-emerald-100 text-emerald-700">Sem alertas de qualidade</span>}</div></section></>}
    </div>
  )
}
