import { useMemo, useState } from 'react'
import { RUOLI } from '../engine/attributi'
import { rosa, xiDi } from '../engine/carriera'
import { eta } from '../engine/progressione'
import { MODULI, type Carriera, type Giocatore, type Modulo } from '../engine/tipi'
import { Card, Overall } from './comuni'
import { euro, RUOLO_BREVE, RUOLO_ESTESO } from './formato'

type Ordine = 'ruolo' | 'overall' | 'valore' | 'stipendio' | 'eta'

export function Rosa({
  carriera,
  clubId,
  oggi,
  onApri,
  onCambia,
}: {
  carriera: Carriera
  clubId: string
  oggi: string
  onApri: (g: Giocatore) => void
  onCambia?: (c: Carriera) => void
}) {
  const [ordine, setOrdine] = useState<Ordine>('ruolo')
  const mia = clubId === carriera.clubUtente && onCambia
  const giocatori = rosa(carriera, clubId)
  const titolari = useMemo(() => new Set(xiDi(carriera, clubId).map((g) => g.id)), [carriera, clubId])
  const ordinati = [...giocatori].sort((a, b) => {
    switch (ordine) {
      case 'overall':
        return b.overall - a.overall
      case 'valore':
        return b.valore - a.valore
      case 'stipendio':
        return b.stipendioNetto - a.stipendioNetto
      case 'eta':
        return (a.nascita ?? '').localeCompare(b.nascita ?? '')
      default:
        return RUOLI.indexOf(a.ruolo) - RUOLI.indexOf(b.ruolo) || b.overall - a.overall
    }
  })
  const monteNetto = giocatori.reduce((s, g) => s + g.stipendioNetto, 0)
  const valoreRosa = giocatori.reduce((s, g) => s + g.valore, 0)

  const escludi = (id: string) => {
    if (!onCambia) return
    const esclusi = carriera.esclusi.includes(id) ? carriera.esclusi.filter((e) => e !== id) : [...carriera.esclusi, id]
    onCambia({ ...carriera, esclusi })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Dato etichetta="Giocatori" valore={String(giocatori.length)} />
        <Dato etichetta="Valore rosa" valore={euro(valoreRosa)} />
        <Dato etichetta="Ingaggi netti" valore={euro(monteNetto)} />
      </div>

      {mia && (
        <Card titolo="Modulo">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODULI) as Modulo[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onCambia({ ...carriera, modulo: m })}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  carriera.modulo === m ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Gli 11 titolari sono scelti in automatico tra i migliori per ruolo. Tocca ⊘ per escludere un giocatore.
          </p>
        </Card>
      )}

      <div className="flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500">Ordina:</span>
        {(['ruolo', 'overall', 'valore', 'stipendio', 'eta'] as Ordine[]).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOrdine(o)}
            className={`rounded-full px-3 py-1 capitalize ${ordine === o ? 'bg-white text-slate-900' : 'bg-white/10'}`}
          >
            {o === 'eta' ? 'età' : o}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
        {ordinati.map((g, i) => {
          const nuovoRuolo = ordine === 'ruolo' && (i === 0 || ordinati[i - 1].ruolo !== g.ruolo)
          const escluso = carriera.esclusi.includes(g.id)
          return (
            <li key={g.id}>
              {nuovoRuolo && (
                <div className="bg-white/5 px-3 py-1 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  {RUOLO_ESTESO[g.ruolo]}
                </div>
              )}
              <div className={`flex items-center gap-3 px-3 py-2 ${escluso ? 'opacity-40' : ''}`}>
                <button type="button" onClick={() => onApri(g)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <Overall valore={g.overall} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate font-medium">
                      {titolari.has(g.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" title="Titolare" />}
                      <span className="truncate">{g.nome}</span>
                      {!g.reale && <span className="rounded bg-amber-500/20 px-1 text-[10px] text-amber-200">stimato</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {RUOLO_BREVE[g.ruolo]} · {eta(g.nascita, oggi) ?? '?'} anni · {euro(g.valore)}
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-slate-400 sm:block">
                    <div>{euro(g.stipendioNetto)}</div>
                    <div>
                      {g.stagione.presenze}p {g.stagione.gol}g {g.stagione.assist}a
                    </div>
                  </div>
                </button>
                {mia && (
                  <button
                    type="button"
                    onClick={() => escludi(g.id)}
                    className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/10"
                    title={escluso ? 'Rendi disponibile' : 'Escludi dalla formazione'}
                    aria-label={escluso ? 'Rendi disponibile' : 'Escludi dalla formazione'}
                  >
                    {escluso ? '↺' : '⊘'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Dato({ etichetta, valore }: { etichetta: string; valore: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-2 py-3">
      <div className="text-xs text-slate-500">{etichetta}</div>
      <div className="font-bold">{valore}</div>
    </div>
  )
}
