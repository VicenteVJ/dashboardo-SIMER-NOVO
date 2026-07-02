const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const MAX_NETLIFY_UPLOAD_BYTES = 4 * 1024 * 1024

function validateServerlessUpload(files) {
  if (!import.meta.env.PROD) return
  const total = files.reduce((sum, file) => sum + (file?.size || 0), 0)
  if (total > MAX_NETLIFY_UPLOAD_BYTES) {
    throw new Error('O upload no Netlify aceita até 4 MB por requisição. Reduza o arquivo Excel e tente novamente.')
  }
}

export function apiUrl(path) {
  return `${API_BASE}${path}`
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), options)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const textMessage = typeof payload === 'string' ? payload.trim() : ''
    throw new Error(payload?.message || payload?.error || textMessage || 'Não foi possível concluir a operação.')
  }
  return payload
}

export const api = {
  health: () => request('/api/health'),
  tickets: (query = '') => request(`/api/tickets${query ? `?${query}` : ''}`),
  ticket: (number) => request(`/api/tickets/${encodeURIComponent(number)}`),
  summary: (query = '') => request(`/api/summary${query ? `?${query}` : ''}`),
  uploadCurrent(file) {
    validateServerlessUpload([file])
    const formData = new FormData()
    formData.append('file', file)
    return request('/api/upload/current', { method: 'POST', body: formData })
  },
  removeCurrent: () => request('/api/upload/current', { method: 'DELETE' }),
  compare(oldFile, newFile) {
    validateServerlessUpload([oldFile, newFile])
    const formData = new FormData()
    formData.append('oldFile', oldFile)
    formData.append('newFile', newFile)
    return request('/api/compare', { method: 'POST', body: formData })
  },
  exportUrl: (path, query = '') => `${apiUrl(path)}${query ? `?${query}` : ''}`
}
