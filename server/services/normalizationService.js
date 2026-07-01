import { differenceInDays, parseDate, toIsoOrNull } from '../utils/date.js'
import { normalizeText, safeText } from '../utils/text.js'

const HEADER_ALIASES = {
  numero: ['numero', 'n ticket', 'ticket', 'numero ticket', 'chamado', 'id'],
  abertoEm: ['aberto em', 'data abertura', 'abertura', 'criado em'],
  departamento: ['departamento', 'departamento solicitante', 'depto'],
  usuarioSolicitante: ['usuario solicitante', 'solicitante', 'usuario'],
  servico: ['servico 2o nivel', 'servico 2 nivel', 'servico', 'servico segundo nivel'],
  assunto: ['assunto', 'titulo', 'descricao'],
  responsavel: ['responsavel', 'atendente', 'atribuido a'],
  categoria: ['categoria', 'tipo'],
  ultimaAcao: ['data da ultima acao', 'ultima acao', 'data ultima acao', 'atualizado em'],
  status: ['status', 'situacao'],
  clientePessoa: ['cliente pessoa', 'cliente', 'pessoa', 'empresa'],
  ticketPriorizado: ['ticket priorizado', 'priorizado', 'prioridade', 'ticket prioritario']
}

const LOOKUP = new Map()
for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) LOOKUP.set(normalizeText(alias), field)
}

export function mapHeaders(row) {
  const mapped = {}
  for (const [header, value] of Object.entries(row || {})) {
    const normalized = normalizeText(header).replace(/\s+/g, ' ')
    const field = LOOKUP.get(normalized)
    if (field && mapped[field] == null) mapped[field] = value
  }
  return mapped
}

export function isOpenStatus(status) {
  return !['fechado', 'resolvido', 'cancelado'].includes(normalizeText(status))
}

export function isWaitingStatus(status) {
  return normalizeText(status).includes('aguardando')
}

export function parsePriority(value) {
  return ['sim', 's', 'yes', 'true', '1', 'priorizado'].includes(normalizeText(value)) || value === true || value === 1
}

export function normalizeTicket(row, now = new Date()) {
  const data = mapHeaders(row)
  const numero = safeText(data.numero)
  const abertoDate = parseDate(data.abertoEm)
  const abertoEm = toIsoOrNull(data.abertoEm)
  const ultimaAcao = toIsoOrNull(data.ultimaAcao)
  const status = safeText(data.status)
  const estaAberto = isOpenStatus(status)
  const tempoEmAbertoDias = abertoDate ? differenceInDays(abertoDate, now) : 0

  return {
    numero,
    abertoEm,
    departamento: safeText(data.departamento),
    usuarioSolicitante: safeText(data.usuarioSolicitante),
    servico: safeText(data.servico),
    assunto: safeText(data.assunto),
    responsavel: safeText(data.responsavel),
    categoria: safeText(data.categoria),
    ultimaAcao,
    status,
    clientePessoa: safeText(data.clientePessoa),
    ticketPriorizado: parsePriority(data.ticketPriorizado),
    tempoEmAbertoDias,
    mesAno: abertoDate ? `${abertoDate.getFullYear()}-${String(abertoDate.getMonth() + 1).padStart(2, '0')}` : '(vazio)',
    estaAberto,
    aguardandoRetorno: estaAberto && isWaitingStatus(status),
    foraDoPrazo: estaAberto && tempoEmAbertoDias > 7
  }
}

export function normalizeRows(rows, now = new Date()) {
  return (rows || [])
    .filter((row) => row && Object.values(row).some((value) => String(value ?? '').trim()))
    .map((row) => normalizeTicket(row, now))
    .filter((ticket) => ticket.numero !== '(vazio)' || Object.values(ticket).some((value) => value && value !== '(vazio)'))
}

export function refreshDerivedFields(ticket, now = new Date()) {
  const abertoDate = parseDate(ticket.abertoEm)
  const status = safeText(ticket.status)
  const estaAberto = isOpenStatus(status)
  const tempoEmAbertoDias = abertoDate ? differenceInDays(abertoDate, now) : 0
  return {
    ...ticket,
    status,
    tempoEmAbertoDias,
    mesAno: abertoDate ? `${abertoDate.getFullYear()}-${String(abertoDate.getMonth() + 1).padStart(2, '0')}` : '(vazio)',
    estaAberto,
    aguardandoRetorno: estaAberto && isWaitingStatus(status),
    foraDoPrazo: estaAberto && tempoEmAbertoDias > 7
  }
}
