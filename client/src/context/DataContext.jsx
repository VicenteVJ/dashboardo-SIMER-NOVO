import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { EMPTY_SUMMARY, makeSummary, riskSort } from '../utils/tickets'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [tickets, setTickets] = useState([])
  const [health, setHealth] = useState({ hasCurrentFile: false, fileName: null, ticketCount: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [healthData, ticketData] = await Promise.all([api.health(), api.tickets()])
      setHealth(healthData)
      setTickets(ticketData.tickets)
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const uploadCurrent = async (file) => {
    setLoading(true)
    try {
      const result = await api.uploadCurrent(file)
      await refresh()
      setMessage({ type: 'success', text: `${result.fileName} carregado com ${result.summary.total} tickets.` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const removeCurrent = async () => {
    if (!window.confirm('Remover o Excel atual e o cache local?')) return
    setLoading(true)
    try {
      await api.removeCurrent()
      setTickets([])
      setHealth({ hasCurrentFile: false, fileName: null, ticketCount: 0 })
      setMessage({ type: 'success', text: 'Excel e cache removidos.' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const value = useMemo(() => ({
    tickets, health, loading, message, setMessage, refresh, uploadCurrent, removeCurrent,
    summary: tickets.length ? makeSummary(tickets) : EMPTY_SUMMARY,
    prioritized: tickets.filter((ticket) => ticket.estaAberto && ticket.ticketPriorizado).sort(riskSort).slice(0, 6)
  }), [tickets, health, loading, message, refresh])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData precisa estar dentro de DataProvider')
  return context
}
