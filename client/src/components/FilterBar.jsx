const MONTHS = [
  ['1', 'Jan'], ['2', 'Fev'], ['3', 'Mar'], ['4', 'Abr'], ['5', 'Mai'], ['6', 'Jun'],
  ['7', 'Jul'], ['8', 'Ago'], ['9', 'Set'], ['10', 'Out'], ['11', 'Nov'], ['12', 'Dez']
]

function unique(tickets, field) {
  return [...new Set(tickets.map((ticket) => ticket[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="min-w-0">
      <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => <option key={String(option.value ?? option)} value={option.value ?? option}>{option.label ?? option}</option>)}
      </select>
    </label>
  )
}

function StatusSelect({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const toggle = (status) => onChange(selected.includes(status) ? selected.filter((item) => item !== status) : [...selected, status])
  return (
    <details className="relative min-w-0">
      <summary className="list-none">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted">Status</span>
        <div className="field cursor-pointer truncate">{selected.length ? `${selected.length} selecionado(s)` : 'Todos'}</div>
      </summary>
      <div className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-64 overflow-auto rounded-xl border bg-white p-2 shadow-xl dark:bg-slate-900">
        {options.map((status) => <label key={status} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={selected.includes(status)} onChange={() => toggle(status)} className="accent-brand" />{status}</label>)}
        {selected.length > 0 && <button className="mt-1 w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-brand" onClick={() => onChange([])}>Limpar status</button>}
      </div>
    </details>
  )
}

export default function FilterBar({ tickets, filters, onChange, onClear, onExport }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value, aging: key === 'aging' ? value : filters.aging })
  const years = [...new Set(tickets.map((ticket) => ticket.mesAno?.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse()
  return (
    <div className="card">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-bold">Filtros da análise</h2>
          <p className="mt-0.5 text-[10px] text-muted">Combine os campos para refinar indicadores, gráficos e tabela.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={onExport}>Exportar base filtrada</button>
          <button className="btn-secondary" onClick={onClear}>Limpar filtros</button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-12">
        <label className="col-span-2">
          <span className="mb-0.5 block text-[10px] font-bold uppercase text-muted">Busca textual</span>
          <input className="field" placeholder="Número, assunto, cliente…" value={filters.search} onChange={(event) => set('search')(event.target.value)} />
        </label>
        <StatusSelect value={filters.status} options={unique(tickets, 'status')} onChange={set('status')} />
        <Select label="Departamento" value={filters.departamento} options={unique(tickets, 'departamento')} onChange={set('departamento')} />
        <Select label="Cliente" value={filters.clientePessoa} options={unique(tickets, 'clientePessoa')} onChange={set('clientePessoa')} />
        <Select label="Categoria" value={filters.categoria} options={unique(tickets, 'categoria')} onChange={(categoria) => onChange({ ...filters, categoria, categoriaGrupo: '' })} />
        <Select label="Serviço" value={filters.servico} options={unique(tickets, 'servico')} onChange={set('servico')} />
        <Select label="Responsável" value={filters.responsavel} options={unique(tickets, 'responsavel')} onChange={set('responsavel')} />
        <Select label="Prioridade" value={filters.prioridade} options={[{ value: 'true', label: 'Priorizados' }, { value: 'false', label: 'Não priorizados' }]} onChange={set('prioridade')} />
        <Select label="Ano" value={filters.ano} options={years} onChange={set('ano')} />
        <Select label="Mês" value={filters.mes} options={MONTHS.map(([value, label]) => ({ value, label }))} onChange={set('mes')} />
        <label className="flex items-end gap-1.5 whitespace-nowrap pb-1.5 text-[9px] font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-brand" checked={filters.somenteAberto} onChange={(event) => set('somenteAberto')(event.target.checked)} /> Só abertos
        </label>
      </div>
      <details className="mt-2 border-t pt-2">
        <summary className="cursor-pointer text-xs font-bold text-brand">Filtros de governança e ITIL <span className="ml-1 text-[10px] font-normal text-muted">— campos inferidos pelo sistema</span></summary>
        <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select label="Status gerencial" value={filters.statusGerencial} options={unique(tickets, 'statusGerencial')} onChange={set('statusGerencial')} />
          <Select label="Tipo ITIL" value={filters.tipoITIL} options={unique(tickets, 'tipoITIL')} onChange={set('tipoITIL')} />
          <Select label="Prioridade gerencial" value={filters.prioridadeGerencial} options={['P1', 'P2', 'P3', 'P4']} onChange={set('prioridadeGerencial')} />
          <Select label="Situação SLA" value={filters.situacaoSLA} options={unique(tickets, 'situacaoSLA')} onChange={set('situacaoSLA')} />
          <Select label="Nível de risco" value={filters.nivelRisco} options={['Crítico', 'Alto', 'Médio', 'Baixo']} onChange={set('nivelRisco')} />
          <Select label="Quadrante Eisenhower" value={filters.quadranteEisenhower} options={['Fazer agora', 'Planejar', 'Delegar / tratar com controle', 'Monitorar / baixa prioridade']} onChange={set('quadranteEisenhower')} />
          <Select label="Responsável gerencial" value={filters.responsavelGerencial} options={unique(tickets, 'responsavelGerencial')} onChange={set('responsavelGerencial')} />
          <Select label="Dependência externa" value={filters.dependenciaExterna} options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} onChange={set('dependenciaExterna')} />
          <Select label="Sem atualização" value={filters.semAtualizacao} options={[{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]} onChange={set('semAtualizacao')} />
          <div className="col-span-2"><Select label="Motivo de espera inferido" value={filters.motivoEsperaInferido} options={unique(tickets, 'motivoEsperaInferido')} onChange={set('motivoEsperaInferido')} /></div>
        </div>
      </details>
    </div>
  )
}
