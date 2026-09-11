import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { DROGHE, grammiDi, type DatiDroga } from '../engine/droga'
import { grammiRichiesti, prezzoAlGrammo, quantoSiFida } from '../engine/spaccio'
import { quartierePerId } from '../engine/quartieri'
import { livelloRicerca } from '../engine/polizia'
import { cePropostaDiSpaccino, spaccinoAllaPortata } from '../engine/spaccini'

/**
 * Il banchetto ambulante.
 *
 * Sta in basso a sinistra e c'è solo quando serve: senza roba addosso, dentro
 * un posto o in mezzo a un raid, sparisce.
 *
 * Vendere non è un tocco solo: si apre il banchetto e si decide a chi e quanto.
 * È lì che sta la scelta — il cliente si aspetta un certo taglio, e chi gliene
 * mette in mano il doppio guadagna il doppio solo se quello non si insospettisce.
 */
export function Strada() {
  const stato = useGame()
  const assumiSpaccino = useGame((s) => s.assumiSpaccino)
  const ripulisciIlParchetto = useGame((s) => s.ripulisciIlParchetto)
  const [banchetto, setBanchetto] = useState(false)

  // Per strada c'è sempre uno scontro aperto — è il campo in cui volano i
  // colpi — ma lavorare si lavora lo stesso. A sparire è solo durante un raid.
  const fermi = stato.ambiente !== 'citta' || stato.scontro?.tipo === 'raid'

  const conRoba = DROGHE.filter((d) => grammiDi(stato.giocatore.roba, d.id) > 0)
  const daRipulire = stato.parcoCorrente === 'bandelle' && stato.storia.passo === 'parchetto'
  const daAssumere =
    stato.parcoCorrente !== null &&
    cePropostaDiSpaccino(stato) &&
    !spaccinoAllaPortata(stato, { x: stato.cella.x + 0.5, y: stato.cella.y + 0.5 })

  if (fermi || (conRoba.length === 0 && !daAssumere && !daRipulire)) return null

  const zona = quartierePerId(stato.quartiereCorrente)
  const stelle = livelloRicerca(stato)

  return (
    <>
      {banchetto && conRoba.length > 0 && (
        <Banchetto conRoba={conRoba} chiudi={() => setBanchetto(false)} />
      )}

      <div className="pointer-events-none absolute bottom-24 left-2 flex max-w-[45vw] flex-col items-start gap-1.5 sm:bottom-10 sm:left-4">
        <Riscontro />

        <div className="rounded-md bg-slate-900/75 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 ring-1 ring-slate-700/80 backdrop-blur-sm">
          {zona.nome}
          {stelle > 0 && <span className="ml-1 text-red-400">{'★'.repeat(stelle)}</span>}
        </div>

        {daRipulire && (
          <Pulsante colore="rosso" azione={() => ripulisciIlParchetto(stato.cella)}>
            Ripulisci il parchetto
          </Pulsante>
        )}

        {daAssumere && (
          <Pulsante colore="ambra" azione={assumiSpaccino}>
            Fallo vendere per te
          </Pulsante>
        )}

        {conRoba.length > 0 && (
          <Pulsante colore="verde" azione={() => setBanchetto(true)}>
            Vendi
            <span className="ml-2 font-mono text-[11px] font-normal opacity-80">
              {conRoba.map((d) => `${grammiDi(stato.giocatore.roba, d.id)} g`).join(' · ')}
            </span>
          </Pulsante>
        )}
      </div>
    </>
  )
}

/**
 * Il banchetto: a chi, e quanto.
 *
 * Si sceglie la roba e poi il taglio. Accanto a ogni taglio c'è quanto rende e
 * quanto è probabile che il cliente ci stia: sono le due cose fra cui si
 * decide, e tenerle nascoste renderebbe la scelta un tiro di dado.
 */
function Banchetto({ conRoba, chiudi }: { conRoba: DatiDroga[]; chiudi: () => void }) {
  const stato = useGame()
  const vendi = useGame((s) => s.vendi)
  const [sceltaId, setSceltaId] = useState(conRoba[0].id)

  const scelta = conRoba.find((d) => d.id === sceltaId) ?? conRoba[0]
  const quartiere = stato.quartiereCorrente
  const inTasca = grammiDi(stato.giocatore.roba, scelta.id)
  const chiesti = grammiRichiesti(quartiere)
  const prezzo = prezzoAlGrammo(scelta.id, quartiere)

  const tagli = [...new Set([1, chiesti, chiesti * 2, chiesti * 4])]
    .filter((g) => g <= inTasca)
    .slice(0, 4)

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex justify-center p-3 sm:bottom-6">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-slate-900/95 p-4 ring-1 ring-slate-700 backdrop-blur-sm">
        <p className="text-center text-xs text-slate-300">
          Al prossimo che passa — {prezzo} €/g, qui ne vogliono {chiesti}
        </p>

        {conRoba.length > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {conRoba.map((droga) => (
              <button
                key={droga.id}
                type="button"
                onClick={() => setSceltaId(droga.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  droga.id === scelta.id
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {droga.nome}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {tagli.map((grammi) => (
            <button
              key={grammi}
              type="button"
              onClick={() => vendi(scelta.id, grammi, stato.parcoCorrente !== null)}
              className="flex items-center justify-between gap-3 rounded-lg bg-emerald-600 px-4 py-2 text-left text-sm font-semibold text-slate-950 transition active:scale-[0.98] active:bg-emerald-500"
            >
              <span>{grammi} g</span>
              <span className="font-mono text-xs font-normal">
                {Math.round(grammi * prezzo)} €
                <span className="ml-2 opacity-75">
                  {aParole(quantoSiFida(quartiere, grammi))}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={chiudi}
          className="text-xs text-slate-400 underline-offset-2 hover:underline"
        >
          Chiudi il banchetto
        </button>
      </div>
    </div>
  )
}

/** Quanto ci sta il cliente, detto senza numeri: è una faccia, non una statistica. */
function aParole(fiducia: number): string {
  if (fiducia >= 1) return 'ci sta'
  if (fiducia >= 0.75) return 'ci pensa'
  if (fiducia >= 0.45) return 'diffida'
  return 'quasi mai'
}

/** Com'è andato l'ultimo tentativo. Sparisce da solo: è un riscontro, non un registro. */
function Riscontro() {
  const ultima = useGame((s) => s.ultimaVendita)
  const [visibile, setVisibile] = useState(false)

  useEffect(() => {
    if (!ultima) return
    setVisibile(true)
    const timer = setTimeout(() => setVisibile(false), 2200)
    return () => clearTimeout(timer)
  }, [ultima])

  if (!ultima || !visibile) return null

  return (
    <div
      className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 backdrop-blur-sm ${
        ultima.venduto
          ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/40'
          : 'bg-slate-900/80 text-slate-400 ring-slate-700'
      }`}
    >
      {ultima.venduto
        ? `+${Math.round(ultima.incasso)} € · ${ultima.grammi} g`
        : 'tira dritto'}
    </div>
  )
}

function Pulsante({
  colore,
  azione,
  children,
}: {
  colore: 'verde' | 'ambra' | 'rosso'
  azione: () => void
  children: React.ReactNode
}) {
  const stile = {
    verde: 'bg-emerald-600 text-slate-950 active:bg-emerald-500',
    ambra: 'bg-amber-500 text-slate-950 active:bg-amber-400',
    rosso: 'bg-red-600 text-slate-50 active:bg-red-500',
  }[colore]

  return (
    <button
      type="button"
      onClick={azione}
      className={`pointer-events-auto touch-none rounded-full px-4 py-2 text-left text-xs font-semibold shadow-lg transition active:scale-95 sm:text-sm ${stile}`}
    >
      {children}
    </button>
  )
}
