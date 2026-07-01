import { memo, useEffect, useMemo, useState } from 'react'
import { eisenhowerTone, formatDate, priorityTone, riskSort, riskTone, slaTone, statusTone } from '../utils/tickets'

function TicketTable({ tickets, onSelect, compact = false, presorted = false }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const columns = compact
    ? ['Número', 'Aberto em', 'Categoria', 'Departamento', 'Cliente', 'Assunto', 'Status', 'Prioridade', 'Risco', 'SLA', 'Eisenhower', 'Responsável', 'Tempo']
    : ['Número', 'Aberto em', 'Departamento', 'Solicitante', 'Cliente', 'Serviço', 'Assunto', 'Status', 'Prioridade', 'Risco', 'SLA', 'Eisenhower', 'Última ação', 'Responsável', 'Priorizado', 'Tempo']
  const sorted = useMemo(() => presorted ? tickets : [...tickets].sort(riskSort), [tickets, presorted])
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visible = useMemo(() => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize), [sorted, currentPage, pageSize])

  useEffect(() => setPage(1), [tickets, pageSize])

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div><h2 className="font-bold">Detalhamento de tickets</h2><p className="mt-1 text-xs text-muted">{tickets.length} registros · exibindo no máximo {pageSize} por página</p></div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted">Linhas <select className="field w-20 py-2" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[25, 50, 100].map((size) => <option key={size}>{size}</option>)}</select></label>
      </div>
      <div className="thin-scrollbar max-h-[560px] overflow-auto">
        <table className="w-full min-w-[1660px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-muted dark:bg-slate-800">
            <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2.5 font-bold">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {visible.map((ticket, index) => {
              const cells = compact
                ? [ticket.numero, formatDate(ticket.abertoEm), ticket.categoria, ticket.departamento, ticket.clientePessoa, ticket.assunto, ticket.status, ticket.prioridadeGerencial, ticket.nivelRisco, ticket.situacaoSLA, ticket.quadranteEisenhower, ticket.responsavel, `${ticket.tempoEmAbertoDias}d`]
                : [ticket.numero, formatDate(ticket.abertoEm), ticket.departamento, ticket.usuarioSolicitante, ticket.clientePessoa, ticket.servico, ticket.assunto, ticket.status, ticket.prioridadeGerencial, ticket.nivelRisco, ticket.situacaoSLA, ticket.quadranteEisenhower, formatDate(ticket.ultimaAcao), ticket.responsavel, ticket.ticketPriorizado ? 'Sim' : 'Não', `${ticket.tempoEmAbertoDias}d`]
              return (
                <tr key={`${ticket.numero}-${(currentPage - 1) * pageSize + index}`} onClick={() => onSelect?.(ticket)} className="cursor-pointer bg-white hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800">
                  {cells.map((cell, cellIndex) => {
                    const statusIndex = compact ? 6 : 7
                    const priorityIndex = compact ? 7 : 8
                    const riskIndex = compact ? 8 : 9
                    const slaIndex = compact ? 9 : 10
                    const quadrantIndex = compact ? 10 : 11
                    const tone = cellIndex === statusIndex ? statusTone(ticket.status) : cellIndex === priorityIndex ? priorityTone(ticket.prioridadeGerencial) : cellIndex === riskIndex ? riskTone(ticket.nivelRisco) : cellIndex === slaIndex ? slaTone(ticket.situacaoSLA) : cellIndex === quadrantIndex ? eisenhowerTone(ticket.quadranteEisenhower) : null
                    return <td key={cellIndex} className={`max-w-72 whitespace-nowrap px-3 py-2.5 ${cellIndex === 0 ? 'font-bold text-brand underline-offset-2 hover:underline' : ''}`}>{tone ? <span className={`badge ${tone}`}>{cell}</span> : <span className="block max-w-64 truncate" title={String(cell)}>{cell}</span>}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {!tickets.length && <p className="py-14 text-center text-sm text-muted">Nenhum ticket corresponde aos filtros.</p>}
      </div>
      {tickets.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted"><span>Página {currentPage} de {totalPages} · registros {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, tickets.length)} de {tickets.length}</span><div className="flex gap-2"><button className="btn-secondary px-3 py-2" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button className="btn-secondary px-3 py-2" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></div>}
    </div>
  )
}

export default memo(TicketTable)
