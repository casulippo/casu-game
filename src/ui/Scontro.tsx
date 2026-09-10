import { useGame } from '../store'
import { TEMPO_FUGA } from '../engine/combattimento'

/**
 * La barra dello scontro.
 *
 * Compare solo quando si è in mezzo a uno: quanta vita resta, quanti sono
 * ancora in piedi, e — se dal raid si può scappare — da quanto non ti vede
 * nessuno. Il conto della fuga è l'unica informazione che il giocatore non può
 * ricavare guardando lo schermo.
 */
export function Scontro() {
  const scontro = useGame((s) => s.scontro)
  if (!scontro) return null

  const vita = Math.max(0, Math.round(scontro.giocatore.vita))
  const quota = vita / scontro.giocatore.vitaMax
  const mancano = Math.max(0, Math.ceil(TEMPO_FUGA - scontro.tempoNascosto))
  const inFuga = scontro.evitabile && scontro.tempoNascosto > 0

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-1.5 px-4 sm:top-24">
      <div className="w-56 overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-slate-700 backdrop-blur-sm sm:w-72">
        <div
          className={`h-2.5 transition-[width] duration-150 ${
            quota > 0.35 ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          style={{ width: `${quota * 100}%` }}
        />
      </div>

      <div className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700 backdrop-blur-sm">
        {vita} vita · {scontro.nemici.length} addosso
        {inFuga && <span className="ml-2 text-amber-300">nascosto: {mancano}s</span>}
        {!scontro.evitabile && <span className="ml-2 text-red-400">non si scappa</span>}
      </div>
    </div>
  )
}
