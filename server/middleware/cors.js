export const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8888',
  'https://dashboardo-simer-novo.netlify.app',
  'https://dashboard-simer-novo.netlify.app'
])

const NETLIFY_SITES = [
  'dashboardo-simer-novo.netlify.app',
  'dashboard-simer-novo.netlify.app'
]

function splitOrigins(value) {
  return String(value || '').split(',').map((origin) => origin.trim()).filter(Boolean)
}

function normalizeOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function allowedOrigins(env = process.env) {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...splitOrigins(env.CLIENT_ORIGIN),
    ...splitOrigins(env.ALLOWED_ORIGINS),
    env.URL,
    env.DEPLOY_URL
  ].filter(Boolean).map(normalizeOrigin).filter(Boolean))
}

export function isAllowedOrigin(origin, env = process.env) {
  if (!origin) return true

  const normalized = normalizeOrigin(origin)
  if (!normalized || !/^https?:\/\//i.test(normalized)) return false
  if (allowedOrigins(env).has(normalized)) return true

  const url = new URL(normalized)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  if (url.protocol !== 'https:') return false

  return NETLIFY_SITES.some((site) => url.hostname === site || url.hostname.endsWith(`--${site}`))
}

export function corsMiddleware(request, response, next) {
  const origin = request.headers.origin
  if (!isAllowedOrigin(origin)) {
    const message = 'Origem não autorizada pelo CORS.'
    return response.status(403).json({ success: false, message, error: message, origin })
  }

  response.setHeader('Access-Control-Allow-Origin', origin || '*')
  if (origin) response.vary('Origin')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Max-Age', '86400')

  if (request.method === 'OPTIONS') return response.status(204).end()
  return next()
}
