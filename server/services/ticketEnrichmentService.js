import { parseDate, differenceInDays } from '../utils/date.js'
import { evaluateDataQuality } from '../utils/dataQualityRules.js'
import { applyEisenhower } from './eisenhowerService.js'
import {
  calculateManagerialPriority, classifyItilType, classifyManagerialStatus, estimateImpact, estimateUrgency,
  inferExternalDependency, inferManagerialOwner, inferWaitingReason
} from '../utils/itilClassifier.js'
import { createRecurrenceKey } from '../utils/recurrence.js'
import { promoteImpactByPareto, promotePriorityByPareto } from '../utils/eisenhowerRules.js'
import { calculateSla } from '../utils/slaRules.js'
import { analyzePareto, applyParetoToTicket } from './paretoService.js'

function elapsedUntilClosure(ticket) {
  const opened = parseDate(ticket.abertoEm)
  const lastAction = parseDate(ticket.ultimaAcao)
  if (!opened || !lastAction) return ticket.tempoEmAbertoDias
  return Math.max(0, Math.floor((lastAction.getTime() - opened.getTime()) / 86_400_000))
}

export function calculateRiskScore(ticket) {
  let score = 0
  if (ticket.ticketPriorizado) score += 25
  if (ticket.situacaoSLA === 'Vencido') score += 25
  if (ticket.semAtualizacao) score += 15
  if (ticket.dependenciaExterna) score += 10
  if (['Incidente', 'Problema'].includes(ticket.tipoITIL)) score += 10
  if (ticket.estaAberto && ticket.tempoEmAbertoDias > 15) score += 15
  if (ticket.statusGerencial === 'Em espera') score += 5
  score += Math.min(20, Math.round((ticket.pesoPareto || 0) * 0.3))
  return Math.min(100, score)
}

export function riskLevel(score) {
  if (score >= 80) return 'Crítico'
  if (score >= 60) return 'Alto'
  if (score >= 35) return 'Médio'
  return 'Baixo'
}

function enrichTicketBase(ticket, now = new Date()) {
  const statusGerencial = classifyManagerialStatus(ticket.status)
  const tipoITIL = classifyItilType(ticket)
  const updateReference = ticket.ultimaAcao || ticket.abertoEm
  const tempoSemAtualizacaoDias = updateReference ? differenceInDays(updateReference, now) : 0
  const semAtualizacao = Boolean(ticket.estaAberto && tempoSemAtualizacaoDias >= 3)
  const dependenciaExterna = inferExternalDependency(ticket)
  const motivoEsperaInferido = inferWaitingReason(ticket, dependenciaExterna)
  const responsavelGerencial = inferManagerialOwner(ticket, dependenciaExterna, motivoEsperaInferido)
  const impactoEstimado = estimateImpact(ticket, tipoITIL)
  const urgenciaEstimada = estimateUrgency(ticket, tempoSemAtualizacaoDias)
  const prioridadeGerencial = calculateManagerialPriority(impactoEstimado, urgenciaEstimada)
  const elapsedForSla = ticket.estaAberto ? ticket.tempoEmAbertoDias : elapsedUntilClosure(ticket)
  const sla = calculateSla(prioridadeGerencial, elapsedForSla, statusGerencial)
  const quality = evaluateDataQuality(ticket, statusGerencial, tipoITIL, responsavelGerencial)
  const base = {
    ...ticket,
    tempoSemAtualizacaoDias,
    statusGerencial,
    tipoITIL,
    prioridadeGerencial,
    impactoEstimado,
    urgenciaEstimada,
    ...sla,
    motivoEsperaInferido,
    responsavelGerencial,
    dependenciaExterna,
    semAtualizacao,
    recorrenciaChave: createRecurrenceKey(ticket),
    ...quality
  }
  return base
}

const EMPTY_PARETO = {
  paretoCliente: false, paretoServico: false, paretoCategoria: false,
  paretoDepartamento: false, paretoResponsavel: false,
  grupoParetoPrincipal: 'Fora do Pareto', pesoPareto: 0
}

export function enrichTicket(ticket, now = new Date()) {
  const base = { ...enrichTicketBase(ticket, now), ...EMPTY_PARETO }
  const scoreRisco = calculateRiskScore(base)
  return applyEisenhower({ ...base, scoreRisco, nivelRisco: riskLevel(scoreRisco) }, false)
}

export function enrichTickets(tickets, now = new Date()) {
  const baseTickets = tickets.map((ticket) => enrichTicketBase(ticket, now))
  const pareto = analyzePareto(baseTickets)
  const recurrenceCounts = new Map()
  baseTickets.forEach((ticket) => recurrenceCounts.set(ticket.recorrenciaChave, (recurrenceCounts.get(ticket.recorrenciaChave) || 0) + 1))
  return baseTickets.map((ticket) => {
    const withPareto = applyParetoToTicket(ticket, pareto)
    const impactoEstimado = promoteImpactByPareto(withPareto.impactoEstimado, withPareto.pesoPareto)
    const prioridadeGerencial = promotePriorityByPareto(calculateManagerialPriority(impactoEstimado, withPareto.urgenciaEstimada), withPareto.pesoPareto)
    const elapsedForSla = withPareto.estaAberto ? withPareto.tempoEmAbertoDias : elapsedUntilClosure(withPareto)
    const sla = calculateSla(prioridadeGerencial, elapsedForSla, withPareto.statusGerencial)
    const beforeEisenhower = { ...withPareto, impactoEstimado, prioridadeGerencial, ...sla }
    const scoreRisco = calculateRiskScore(beforeEisenhower)
    return applyEisenhower({ ...beforeEisenhower, scoreRisco, nivelRisco: riskLevel(scoreRisco) }, (recurrenceCounts.get(ticket.recorrenciaChave) || 0) >= 2)
  })
}
