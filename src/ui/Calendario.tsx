import { useState } from 'react'
import { prossimaGiornata } from '../engine/carriera'
import type { Carriera, Partita } from '../engine/tipi'

export function RigaPartita({ p, carriera, dettaglio = false }: { p: Partita; carriera: Carriera; dettaglio?: boolean }) {
  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const giocata = p.golCasa !== undefined
  const mia = p.casaId === carriera.clubUtente || p.ospiteId === carriera.clubUtente
  let esito = ''
  if (giocata && mia) {
    const fatti = p.casaId === carriera.clubUtente ? p.golCasa! : p.golOspite!
    const subiti = p.casaId === carriera.clubUtente ? p.golOspite! : p.golCasa!
    esito = fatti > subiti ? 'text-emerald-300' : fatti < subiti ? 'text-rose-300' : 'text-slate-300'
  }
  return (
    <div className={mia ? 'font-semibold' : ''}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-1.5 text-sm">
        <span className="truncate text-right">{nomi[p.casaId]}</span>
        <span className={`w-14 rounded bg-white/5 py-0.5 text-center tabular-nums ${esito}`}>
          {giocata ? `${p.golCasa} - ${p.golOspite}` : 'vs'}
        </span>
        <span className="truncate">{nomi[p.ospiteId]}</span>
      </div>
      {dettaglio && giocata && p.eventi && p.eventi.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pb-2 text-xs font-normal text-slate-400">
          {[p.casaId, p.ospiteId].map((club, i) => (
            <ul key={club} className={i === 0 ? 'text-right' : ''}>
              {p.eventi!
                .filter((e) => e.clubId === club)
                .map((e, k) => (
                  <li key={k}>
                    ⚽ {carriera.giocatori[e.marcatoreId]?.nome} {e.minuto}'
                    {e.assistId && <span className="text-slate-500"> ({carriera.giocatori[e.assistId]?.nome})</span>}
                  </li>
                ))}
            </ul>
          ))}
        </div>
      )}
    </div>
  )
}

export function Calendario({ carriera }: { carriera: Carriera }) {
  const [soloMie, setSoloMie] = useState(true)
  const [giornata, setGiornata] = useState(() => {
    const prossima = prossimaGiornata(carriera)
    return prossima ?? Math.max(...carriera.calendario.map((p) => p.giornata))
  })
  const totale = Math.max(...carriera.calendario.map((p) => p.giornata))
  const mie = carriera.calendario
    .filter((p) => p.casaId === carriera.clubUtente || p.ospiteId === carriera.clubUtente)
    .sort((a, b) => a.giornata - b.giornata)

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setSoloMie(true)} className={`rounded-full px-3 py-1 ${soloMie ? 'bg-white text-slate-900' : 'bg-white/10'}`}>
          La mia squadra
        </button>
        <button type="button" onClick={() => setSoloMie(false)} className={`rounded-full px-3 py-1 ${!soloMie ? 'bg-white text-slate-900' : 'bg-white/10'}`}>
          Per giornata
        </button>
      </div>

      {soloMie ? (
        <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-900/70 px-3">
          {mie.map((p) => (
            <div key={p.giornata} className="flex items-center gap-2">
              <span className="w-8 text-xs text-slate-500">{p.giornata}ª</span>
              <div className="flex-1">
                <RigaPartita p={p} carriera={carriera} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" disabled={giornata <= 1} onClick={() => setGiornata(giornata - 1)} className="rounded px-3 py-1 hover:bg-white/10 disabled:opacity-30">
              ‹
            </button>
            <span className="font-semibold">{giornata}ª giornata</span>
            <button type="button" disabled={giornata >= totale} onClick={() => setGiornata(giornata + 1)} className="rounded px-3 py-1 hover:bg-white/10 disabled:opacity-30">
              ›
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {carriera.calendario
              .filter((p) => p.giornata === giornata)
              .map((p) => (
                <RigaPartita key={`${p.casaId}-${p.ospiteId}`} p={p} carriera={carriera} dettaglio />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
