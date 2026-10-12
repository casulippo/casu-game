import { useEffect, type ReactNode } from 'react'
import { coloreOverall } from './formato'

export function Overall({ valore, grande = false }: { valore: number; grande?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tabular-nums ${coloreOverall(valore)} ${
        grande ? 'h-12 w-12 text-xl' : 'h-7 w-8 text-sm'
      }`}
    >
      {valore}
    </span>
  )
}

export function Card({ titolo, children, azione }: { titolo?: string; children: ReactNode; azione?: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
      {(titolo || azione) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {titolo && <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{titolo}</h2>}
          {azione}
        </div>
      )}
      {children}
    </section>
  )
}

export function Bottone({
  children,
  onClick,
  variante = 'primario',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variante?: 'primario' | 'secondario' | 'pericolo'
  disabled?: boolean
}) {
  const stile = {
    primario: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400',
    secondario: 'bg-white/10 text-slate-100 hover:bg-white/15',
    pericolo: 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/30',
  }[variante]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${stile}`}
    >
      {children}
    </button>
  )
}

export function Modale({ titolo, onChiudi, children }: { titolo: string; onChiudi: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onChiudi])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onChiudi}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-slate-900 p-4 sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{titolo}</h2>
          <button type="button" onClick={onChiudi} className="rounded-lg px-3 py-1 text-slate-400 hover:bg-white/10" aria-label="Chiudi">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
