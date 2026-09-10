import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { obiettivo, ultimoMessaggio } from '../engine/storia'

/**
 * Il display del Nokia 3310.
 *
 * I messaggi della storia arrivano qui: verde su verde, caratteri squadrati,
 * una riga per volta. Sta in basso a destra e sparisce da solo dopo un po' —
 * un SMS si legge, non si archivia.
 */
export function Nokia() {
  const messaggio = useGame(ultimoMessaggio)
  const dove = useGame(obiettivo)
  const [aperto, setAperto] = useState(false)

  useEffect(() => {
    if (!messaggio) return
    setAperto(true)
    const timer = setTimeout(() => setAperto(false), 14_000)
    return () => clearTimeout(timer)
  }, [messaggio])

  return (
    <div className="pointer-events-none absolute bottom-2 right-2 flex max-w-[min(20rem,70vw)] flex-col items-end gap-1.5 sm:bottom-4 sm:right-4">
      <div className="rounded-md bg-slate-900/75 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 ring-1 ring-slate-700/80 backdrop-blur-sm">
        {dove}
      </div>

      {messaggio && aperto && (
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="pointer-events-auto rounded-sm border-2 border-lime-900/80 bg-[#9ead3f] px-3 py-2 text-left font-mono text-[11px] leading-snug text-lime-950 shadow-lg sm:text-xs"
        >
          <div className="mb-1 border-b border-lime-950/40 pb-1 font-bold uppercase tracking-widest">
            {messaggio.mittente}
          </div>
          {messaggio.testo}
        </button>
      )}
    </div>
  )
}
