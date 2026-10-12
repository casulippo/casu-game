import { formazione, forza } from '../engine/partita'
import type { Mondo } from '../data/seed'
import { Overall } from './comuni'
import { euro } from './formato'

export function SceltaClub({ mondo, onScegli, onIndietro }: { mondo: Mondo; onScegli: (clubId: string) => void; onIndietro: () => void }) {
  const club = mondo.club
    .map((c) => {
      const rosa = mondo.giocatori.filter((g) => g.clubId === c.id)
      const xi = formazione(rosa, '4-3-3')
      const f = forza(xi)
      return {
        ...c,
        forzaXi: Math.round((f.attacco + f.difesa) / 2),
        valore: rosa.reduce((s, g) => s + g.valore, 0),
        ingaggi: rosa.reduce((s, g) => s + g.stipendioNetto, 0),
        stella: [...rosa].sort((a, b) => b.overall - a.overall)[0],
      }
    })
    .sort((a, b) => b.forzaXi - a.forzaXi)

  const obiettivo = (i: number) => (i < 4 ? 'Scudetto' : i < 8 ? 'Europa' : i < 14 ? 'Metà classifica' : 'Salvezza')

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button type="button" onClick={onIndietro} className="mb-4 text-sm text-slate-400 hover:text-slate-200">
        ‹ Indietro
      </button>
      <h1 className="text-2xl font-bold">Scegli la tua squadra</h1>
      <p className="mt-1 text-sm text-slate-400">Serie A {mondo.stagione} · rose e stipendi reali di settembre 2026</p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {club.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onScegli(c.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-left transition hover:border-emerald-400/60 hover:bg-slate-800"
            >
              <Overall valore={c.forzaXi} grande />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{c.nome}</div>
                <div className="truncate text-xs text-slate-400">
                  Obiettivo: {obiettivo(i)} · stella {c.stella?.nome}
                </div>
                <div className="text-xs text-slate-500">
                  Rosa {euro(c.valore)} · ingaggi {euro(c.ingaggi)}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
