import { useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useData } from '../context/DataContext'
import Sidebar from './Sidebar'
import Toast from './Toast'

export default function Layout() {
  const { health, loading, uploadCurrent, removeCurrent } = useData()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const fileInput = useRef(null)

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (file) await uploadCurrent(file)
    event.target.value = ''
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-canvas dark:bg-slate-950">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className="lg:pl-[236px]">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-canvas/90 px-3 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-4">
            <div className="flex w-full items-center gap-2">
              <button className="btn-secondary px-3 lg:hidden" onClick={() => setSidebarOpen(true)}>☰</button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{health.fileName || 'Nenhum Excel carregado'}</p>
                {health.hasCurrentFile && <p className="text-[10px] text-muted">{health.ticketCount} tickets no cache</p>}
              </div>
              <button className="btn-secondary px-3" onClick={toggleTheme} title="Alternar tema">{dark ? '☀' : '☾'}</button>
              <input ref={fileInput} className="hidden" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} />
              <button className="btn-primary px-3" disabled={loading} onClick={() => fileInput.current?.click()}><span className="sm:hidden">Excel</span><span className="hidden sm:inline">{health.hasCurrentFile ? 'Trocar Excel' : 'Carregar Excel'}</span></button>
              {health.hasCurrentFile && <button className="btn-secondary px-3 text-red-600" title="Remover Excel" disabled={loading} onClick={removeCurrent}><span className="md:hidden">×</span><span className="hidden md:inline">Remover</span></button>}
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] p-3 sm:p-4 lg:px-5"><Outlet /></main>
        </div>
        <Toast />
      </div>
    </div>
  )
}
