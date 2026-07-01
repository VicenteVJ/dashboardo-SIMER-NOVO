import { normalizeText } from './text.js'

const STOP_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'com', 'sem', 'em', 'no', 'na', 'nos', 'nas', 'os', 'as', 'um', 'uma', 'e', 'a', 'o', 'ao', 'erro', 'problema', 'solicitacao', 'ticket', 'chamado'])

export function createRecurrenceKey(ticket) {
  const keywords = normalizeText(ticket.assunto).split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word))
    .slice(0, 5)
  const service = normalizeText(ticket.servico) || 'sem servico'
  const category = normalizeText(ticket.categoria) || 'sem categoria'
  return `${service} | ${category} | ${keywords.join(' ') || 'sem palavras chave'}`
}
