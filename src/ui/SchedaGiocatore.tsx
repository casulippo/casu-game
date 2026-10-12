import { ATTRIBUTI, ETICHETTE_ATTRIBUTI, PESI } from '../engine/attributi'
import { eta } from '../engine/progressione'
import type { Giocatore } from '../engine/tipi'
import { Modale, Overall } from './comuni'
import { coloreAttributo, data, euro, RUOLO_ESTESO } from './formato'

const FONTI_STIPENDIO: Record<string, string> = {
  calcioefinanza: 'netto reale (Calcio e Finanza)',
  'virgilio-lordo-convertito': 'lordo reale (Virgilio), netto stimato',
}

export function SchedaGiocatore({ g, nomeClub, oggi, onChiudi }: { g: Giocatore; nomeClub: string; oggi: string; onChiudi: () => void }) {
  const anni = eta(g.nascita, oggi)
  const chiave = PESI[g.ruolo]
  return (
    <Modale titolo={g.nome} onChiudi={onChiudi}>
      <div className="flex items-start gap-4">
        {g.foto ? (
          <img src={g.foto} alt="" referrerPolicy="no-referrer" className="h-24 w-20 rounded-lg bg-slate-800 object-cover" />
        ) : (
          <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-slate-800 text-3xl text-slate-600">?</div>
        )}
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Overall valore={g.overall} grande />
            <div>
              <div className="font-semibold">{RUOLO_ESTESO[g.ruolo]}</div>
              <div className="text-slate-400">{g.sottoruolo ?? nomeClub}</div>
            </div>
          </div>
          <div className="text-slate-300">
            {nomeClub} · {anni !== null ? `${anni} anni` : 'età ignota'}
            {g.nazionalita && ` · ${g.nazionalita}`}
          </div>
          <div className="text-slate-400">
            {g.altezza ? `${g.altezza} cm` : ''} {g.piede ? `· piede ${g.piede === 'left' ? 'sinistro' : g.piede === 'right' ? 'destro' : 'ambidestro'}` : ''}
          </div>
        </div>
      </div>

      {!g.reale && (
        <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
          Giocatore non trovato su Transfermarkt: età, ruolo, valore e contratto sono inventati. Lo stipendio è reale.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Info etichetta="Valore" valore={euro(g.valore)} />
        <Info etichetta="Stipendio netto" valore={`${euro(g.stipendioNetto)}/anno`} />
        <Info etichetta="Lordo" valore={euro(g.stipendioLordo)} />
        <Info etichetta="Scadenza" valore={data(g.scadenza)} />
      </dl>
      <p className="mt-1 text-xs text-slate-500">Stipendio: {FONTI_STIPENDIO[g.fonteStipendio] ?? g.fonteStipendio}</p>

      <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Attributi</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {ATTRIBUTI.filter((a) => g.ruolo === 'Goalkeeper' || (a !== 'riflessi' && a !== 'presa')).map((a) => (
          <div key={a} className="flex justify-between border-b border-white/5 py-1">
            <span className={chiave[a] ? 'font-medium text-slate-100' : 'text-slate-400'}>{ETICHETTE_ATTRIBUTI[a]}</span>
            <span className={`font-bold tabular-nums ${coloreAttributo(g.attr[a])}`}>{g.attr[a]}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Attributi provvisori, stimati da ruolo, valore ed età: il modello sulle statistiche reali è ancora da costruire.
      </p>

      <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Questa stagione</h3>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Info etichetta="Presenze" valore={String(g.stagione.presenze)} />
        <Info etichetta="Gol" valore={String(g.stagione.gol)} />
        <Info etichetta="Assist" valore={String(g.stagione.assist)} />
      </div>

      {g.statsReali.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Carriera reale (Transfermarkt)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 text-left font-normal">Stagione</th>
                  <th className="text-left font-normal">Competizione</th>
                  <th className="text-right font-normal">Pres</th>
                  <th className="text-right font-normal">Min</th>
                  <th className="text-right font-normal">Gol</th>
                  <th className="text-right font-normal">Ass</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {g.statsReali.map((s) => (
                  <tr key={`${s.stagione}-${s.competizione}`} className="border-t border-white/5">
                    <td className="py-1">
                      {s.stagione}/{String(Number(s.stagione) + 1).slice(2)}
                    </td>
                    <td className="text-slate-400">{s.competizione}</td>
                    <td className="text-right">{s.presenze}</td>
                    <td className="text-right">{s.minuti}</td>
                    <td className="text-right">{s.gol}</td>
                    <td className="text-right">{s.assist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modale>
  )
}

function Info({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <dt className="text-xs text-slate-500">{etichetta}</dt>
      <dd className="font-semibold">{valore}</dd>
    </div>
  )
}
