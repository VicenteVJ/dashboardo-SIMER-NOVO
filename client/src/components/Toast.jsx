import { useEffect } from 'react'
import { useData } from '../context/DataContext'

export default function Toast() {
  const { message, setMessage } = useData()
  useEffect(() => {
    if (!message) return undefined
    const timer = window.setTimeout(() => setMessage(null), 4500)
    return () => window.clearTimeout(timer)
  }, [message, setMessage])
  if (!message) return null
  return (
    <button
      className={`fixed right-5 top-5 z-[80] max-w-sm rounded-xl px-4 py-3 text-left text-sm font-semibold text-white shadow-xl ${message.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
      onClick={() => setMessage(null)}
    >
      {message.text}
    </button>
  )
}
