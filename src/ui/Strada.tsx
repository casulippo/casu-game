import { useGame } from '../store'
import { DROGHE, grammiDi } from '../engine/droga'
import { prezzoAlGrammo } from '../engine/spaccio'
import { quartierePerId } from '../engine/quartieri'
import { livelloRicerca } from '../engine/polizia'
import { cePropostaDiSpaccino, spaccinoAllaPortata } from '../engine/spaccini'

/**
 * Il banchetto ambulante.
 *
 * Sta in basso a sinistra e c'è solo quando serve: se non si ha roba addosso,
 * o se si è dentro un posto, o se c'è uno scontro in corso, sparisce.
 *
 * Ogni tocco è un tentativo di vendita al prossimo che passa: può non
 * comprare nessuno, ed è la regola del gioco, non un errore.
 */
export function Strada() {
  const stato = useGame()
  const vendi = useGame((s) => s.vendi)
  const assumiSpaccino = useGame((s) => s.assumiSpaccino)
  const ripulisciIlParchetto = useGame((s) => s.ripulisciIlParchetto)

  if (stato.ambiente !== 'citta' || stato.scontro) return null

  const conRoba = DROGHE.filter((d) => grammiDi(stato.giocatore.roba, d.id) > 0)
  const daRipulire = stato.parcoCorrente === 'bandelle' && stato.storia.passo === 'parchetto'
  const daAssumere =
    stato.parcoCorrente !== null &&
    cePropostaDiSpaccino(stato) &&
    !spaccinoAllaPortata(stato, { x: stato.cella.x + 0.5, y: stato.cella.y + 0.5 })

  if (conRoba.length === 0 && !daAssumere && !daRipulire) return null

  const zona = quartierePerId(stato.quartiereCorrente)
  const stelle = livelloRicerca(stato)

  return (
    <div className="pointer-events-none absolute bottom-24 left-2 flex max-w-[45vw] flex-col items-start gap-1.5 sm:bottom-10 sm:left-4">
      <div className="rounded-md bg-slate-900/75 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 ring-1 ring-slate-700/80 backdrop-blur-sm">
        {zona.nome}
        {stelle > 0 && <span className="ml-1 text-red-400">{'★'.repeat(stelle)}</span>}
      </div>

      {daRipulire && (
        <button
          type="button"
          onClick={() => ripulisciIlParchetto(stato.cella)}
          className="pointer-events-auto touch-none rounded-full bg-red-600 px-4 py-2 text-left text-xs font-semibold text-slate-50 shadow-lg transition active:scale-95 active:bg-red-500 sm:text-sm"
        >
          Ripulisci il parchetto
        </button>
      )}

      {daAssumere && (
        <button
          type="button"
          onClick={assumiSpaccino}
          className="pointer-events-auto touch-none rounded-full bg-amber-500 px-4 py-2 text-left text-xs font-semibold text-slate-950 shadow-lg transition active:scale-95 active:bg-amber-400 sm:text-sm"
        >
          Fallo vendere per te
        </button>
      )}

      {conRoba.map((droga) => (
        <button
          key={droga.id}
          type="button"
          onClick={() => vendi(droga.id, stato.parcoCorrente !== null)}
          className="pointer-events-auto touch-none rounded-full bg-emerald-600 px-4 py-2 text-left text-xs font-semibold text-slate-950 shadow-lg transition active:scale-95 active:bg-emerald-500 sm:text-sm"
        >
          Vendi {droga.nome}
          <span className="ml-2 font-mono font-normal opacity-80">
            {grammiDi(stato.giocatore.roba, droga.id)} g ·{' '}
            {prezzoAlGrammo(droga.id, stato.quartiereCorrente)} €/g
          </span>
        </button>
      ))}
    </div>
  )
}
