import { classifica } from '../engine/classifica'
import type { Carriera } from '../engine/tipi'

const COLORE_FORMA = { V: 'bg-emerald-500', N: 'bg-slate-500', P: 'bg-rose-500' }

// Fasce della Serie A: 4 in Champions, 5ª Europa League, 6ª Conference, ultime 3 retrocesse.
function fascia(pos: number, totale: number): string {
  if (pos <= 4) return 'border-l-sky-400'
  if (pos === 5) return 'border-l-orange-400'
  if (pos === 6) return 'border-l-lime-400'
  if (pos > totale - 3) return 'border-l-rose-500'
  return 'border-l-transparent'
}

export function Classifica({ carriera, compatta = false, onApriClub }: { carriera: Carriera; compatta?: boolean; onApriClub?: (id: string) => void }) {
  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const righe = classifica(carriera.club.map((c) => c.id), carriera.calendario)
  const mia = righe.findIndex((r) => r.clubId === carriera.clubUtente)
  const visibili = compatta ? righe.map((r, i) => ({ r, i })).filter(({ i }) => i < 3 || Math.abs(i - mia) <= 1) : righe.map((r, i) => ({ r, i }))

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="w-8 py-2 pl-3 text-left font-normal">#</th>
            <th className="text-left font-normal">Squadra</th>
            <th className="w-8 text-right font-normal">G</th>
            {!compatta && (
              <>
                <th className="hidden w-8 text-right font-normal sm:table-cell">V</th>
                <th className="hidden w-8 text-right font-normal sm:table-cell">N</th>
                <th className="hidden w-8 text-right font-normal sm:table-cell">P</th>
                <th className="w-14 text-right font-normal">Gol</th>
              </>
            )}
            <th className="w-10 text-right font-normal">DR</th>
            <th className="w-10 pr-3 text-right font-normal">Pt</th>
            {!compatta && <th className="hidden w-24 pr-3 font-normal md:table-cell">Forma</th>}
          </tr>
        </thead>
        <tbody>
          {visibili.map(({ r, i }, k) => (
            <tr
              key={r.clubId}
              onClick={() => onApriClub?.(r.clubId)}
              className={`border-t border-l-4 border-t-white/5 ${fascia(i + 1, righe.length)} ${
                r.clubId === carriera.clubUtente ? 'bg-emerald-500/15 font-semibold' : ''
              } ${onApriClub ? 'cursor-pointer hover:bg-white/5' : ''} ${compatta && k > 0 && visibili[k - 1].i !== i - 1 ? 'border-t-white/30' : ''}`}
            >
              <td className="py-2 pl-2">{i + 1}</td>
              <td className="truncate">{nomi[r.clubId]}</td>
              <td className="text-right">{r.giocate}</td>
              {!compatta && (
                <>
                  <td className="hidden text-right sm:table-cell">{r.vinte}</td>
                  <td className="hidden text-right sm:table-cell">{r.pari}</td>
                  <td className="hidden text-right sm:table-cell">{r.perse}</td>
                  <td className="text-right">
                    {r.golFatti}:{r.golSubiti}
                  </td>
                </>
              )}
              <td className="text-right">{r.golFatti - r.golSubiti > 0 ? `+${r.golFatti - r.golSubiti}` : r.golFatti - r.golSubiti}</td>
              <td className="pr-3 text-right font-bold">{r.punti}</td>
              {!compatta && (
                <td className="hidden pr-3 md:table-cell">
                  <div className="flex gap-1">
                    {r.forma.map((f, j) => (
                      <span key={j} className={`h-2.5 w-2.5 rounded-full ${COLORE_FORMA[f]}`} title={f} />
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
