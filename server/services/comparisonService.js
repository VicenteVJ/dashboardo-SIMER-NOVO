const FIELDS = [
  ['status', 'Status'],
  ['responsavel', 'Responsável'],
  ['categoria', 'Categoria'],
  ['ticketPriorizado', 'Ticket priorizado'],
  ['assunto', 'Assunto'],
  ['clientePessoa', 'Cliente'],
  ['departamento', 'Departamento'],
  ['ultimaAcao', 'Data da última ação'],
  ['statusGerencial', 'Status gerencial'],
  ['tipoITIL', 'Tipo ITIL'],
  ['prioridadeGerencial', 'Prioridade gerencial'],
  ['situacaoSLA', 'Situação SLA'],
  ['nivelRisco', 'Nível de risco'],
  ['scoreRisco', 'Score de risco'],
  ['dependenciaExterna', 'Dependência externa'],
  ['semAtualizacao', 'Sem atualização'],
  ['urgente', 'Urgente'],
  ['importante', 'Importante'],
  ['quadranteEisenhower', 'Quadrante Eisenhower'],
  ['grupoParetoPrincipal', 'Grupo Pareto principal'],
  ['pesoPareto', 'Peso Pareto']
]

function indexByNumber(tickets) {
  return new Map(tickets.map((ticket) => [String(ticket.numero), ticket]))
}

export function compareTickets(oldTickets, newTickets) {
  const oldMap = indexByNumber(oldTickets)
  const newMap = indexByNumber(newTickets)
  const newItems = []
  const removedItems = []
  const changedItems = []
  const governance = { novosCriticos: 0, pioraramRisco: 0, melhoraramRisco: 0, venceramSLA: 0, sairamAguardando: 0, resolvidosNoNovo: 0 }

  for (const [numero, after] of newMap) {
    const before = oldMap.get(numero)
    if (!before) {
      const impacts = (after.nivelRisco === 'Crítico' || ['P1', 'P2'].includes(after.prioridadeGerencial)) ? ['novo-critico'] : []
      if (impacts.length) governance.novosCriticos += 1
      newItems.push({ numero, type: 'novo', before: null, after, changes: [], governanceImpacts: impacts })
      continue
    }
    const changes = FIELDS.flatMap(([field, label]) => {
      const previous = before[field]
      const next = after[field]
      return String(previous ?? '') === String(next ?? '') ? [] : [{ field, label, before: previous, after: next }]
    })
    if (changes.length) {
      const governanceImpacts = []
      if ((after.scoreRisco ?? 0) > (before.scoreRisco ?? 0)) { governance.pioraramRisco += 1; governanceImpacts.push('piorou-risco') }
      if ((after.scoreRisco ?? 0) < (before.scoreRisco ?? 0)) { governance.melhoraramRisco += 1; governanceImpacts.push('melhorou-risco') }
      if (before.situacaoSLA !== 'Vencido' && after.situacaoSLA === 'Vencido') { governance.venceramSLA += 1; governanceImpacts.push('venceu-sla') }
      if (before.statusGerencial === 'Em espera' && after.statusGerencial !== 'Em espera') { governance.sairamAguardando += 1; governanceImpacts.push('saiu-aguardando') }
      if (before.statusGerencial !== 'Encerrado' && after.statusGerencial === 'Encerrado') { governance.resolvidosNoNovo += 1; governanceImpacts.push('resolvido') }
      changedItems.push({ numero, type: 'alterado', before, after, changes, governanceImpacts })
    }
  }

  for (const [numero, before] of oldMap) {
    if (!newMap.has(numero)) removedItems.push({ numero, type: 'removido', before, after: null, changes: [], governanceImpacts: [] })
  }

  const all = [...changedItems, ...newItems, ...removedItems]
  return {
    generatedAt: new Date().toISOString(),
    counts: {
      novos: newItems.length,
      removidos: removedItems.length,
      alterados: changedItems.length,
      totalComparado: new Set([...oldMap.keys(), ...newMap.keys()]).size,
      ...governance
    },
    newTickets: newItems,
    removedTickets: removedItems,
    changedTickets: changedItems,
    all
  }
}
