export default function StatCard({ label, value, note, tone = 'blue', onClick, active = false, inferred = false, density = 'compact' }) {
  const tones = {
    blue: 'from-blue-500 to-indigo-500', violet: 'from-violet to-purple-600', red: 'from-red-500 to-rose-600',
    amber: 'from-amber-400 to-orange-500', green: 'from-emerald-400 to-green-600', slate: 'from-slate-500 to-slate-700'
  }
  const densities = {
    default: 'min-h-[112px] p-4',
    compact: 'min-h-[96px] p-3',
    mini: 'min-h-[76px] p-3'
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag aria-pressed={onClick ? active : undefined} onClick={onClick} className={`relative overflow-hidden rounded-xl border border-white/80 bg-white text-left shadow-card dark:border-slate-800 dark:bg-slate-900 ${densities[density] || densities.compact} ${onClick ? 'w-full transition hover:-translate-y-0.5 hover:shadow-lg' : ''} ${active ? 'ring-2 ring-brand ring-offset-2 dark:ring-offset-slate-950' : ''}`}>
      <div className={`absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-10 ${tones[tone]}`} />
      <div className="flex items-start justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>{inferred && <span className="cursor-help text-[10px] text-violet" title="Indicador inferido automaticamente pelo sistema com base nos dados disponíveis no Excel.">ⓘ</span>}</div>
      <strong className="mt-1.5 block text-2xl font-extrabold leading-none">{value}</strong>
      {note && <p className="mt-1 text-[10px] leading-4 text-muted">{note}</p>}
      <span className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${tones[tone]}`} />
    </Tag>
  )
}
