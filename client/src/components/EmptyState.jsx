import { useRef } from 'react'
import { useData } from '../context/DataContext'

export default function EmptyState() {
  const { uploadCurrent, loading } = useData()
  const input = useRef(null)
  return (
    <div className="card mx-auto mt-16 max-w-xl py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-brand dark:bg-blue-950">▤</div>
      <h2 className="mt-5 text-2xl font-extrabold">Carregue a base de tickets</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Selecione uma planilha `.xlsx`. Ela será normalizada, salva no cache local e continuará disponível após reiniciar o servidor.</p>
      <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(event) => event.target.files?.[0] && uploadCurrent(event.target.files[0])} />
      <button className="btn-primary mt-6" disabled={loading} onClick={() => input.current?.click()}>{loading ? 'Processando…' : 'Selecionar Excel'}</button>
    </div>
  )
}
