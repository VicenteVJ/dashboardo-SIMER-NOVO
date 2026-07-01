import { classifyQuadrant, EISENHOWER_ACTIONS, importanceReasons, urgencyReasons } from '../utils/eisenhowerRules.js'

export function applyEisenhower(ticket, recurring = false) {
  const motivoUrgencia = urgencyReasons(ticket)
  const motivoImportancia = importanceReasons(ticket, recurring)
  const urgente = motivoUrgencia.length > 0
  const importante = motivoImportancia.length > 0
  const quadranteEisenhower = classifyQuadrant(urgente, importante)
  return {
    ...ticket,
    urgente,
    importante,
    quadranteEisenhower,
    motivoUrgencia,
    motivoImportancia,
    acaoRecomendada: EISENHOWER_ACTIONS[quadranteEisenhower]
  }
}
