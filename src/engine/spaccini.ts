import type { Griglia } from './iso'
import type { Droga, GameState, Inventario, Quartiere } from './state'
import { conRoba, grammiDi, grammiTotali } from './droga'
import { puoAssumereSpaccini } from './livello'
import { incassa, prezzoAlGrammo } from './spaccio'

/**
 * Gli spaccini.
 *
 * Sono i ragazzini dei parchetti: dopo che gli hai venduto erba un paio di
 * volte sono loro a chiederti di lavorare per te. Gli lasci metà della roba e
 * ogni tanto hanno dei soldi da darti — che però vanno ritirati passando da
 * loro, e finché stanno lì sono soldi che non hai.
 *
 * È il primo guadagno che non richiede di essere sul posto, e per questo si
 * apre solo al livello 3.
 */

export interface Spaccino {
  id: string
  nome: string
  quartiere: Quartiere
  /** Dove sta: ci si passa sopra per ritirare. */
  cella: Griglia
  /** La roba che gli hai lasciato. */
  roba: Inventario
  /** Quello che ha incassato e non ti ha ancora dato. */
  cassa: number
  /** Ore di gioco passate dall'ultimo versamento. */
  daUltimoVersamento: number
}

/** Quante vendite ai ragazzini servono prima che si offrano loro. */
export const VENDITE_PER_PROPOSTA = 2

/** Ogni quante ore di gioco mettono via l'incasso. Circa dieci minuti reali. */
export const ORE_FRA_I_VERSAMENTI = 4

/** Quanti grammi piazza uno spaccino in un'ora, a piazza piena. */
const GRAMMI_ALL_ORA = 5

/** La parte che si tiene lui. */
const SUA_PARTE = 0.3

/** Distanza entro cui si ritira, in celle. */
export const RAGGIO_RITIRO = 1.1

/** Segnare una vendita fatta ai ragazzini del parchetto. */
export function venditaAiRagazzini(stato: GameState): GameState {
  return {
    ...stato,
    mercato: {
      ...stato.mercato,
      venditeAiRagazzini: stato.mercato.venditeAiRagazzini + 1,
    },
  }
}

/**
 * Si è offerto qualcuno?
 *
 * Servono due vendite ai ragazzini e il livello 3: prima di allora nessuno si
 * fida abbastanza da mettersi a vendere per te.
 */
export function cePropostaDiSpaccino(stato: GameState): boolean {
  return (
    stato.mercato.venditeAiRagazzini >= VENDITE_PER_PROPOSTA &&
    puoAssumereSpaccini(stato.giocatore.livello)
  )
}

export function assumi(
  stato: GameState,
  spaccino: { id: string; nome: string; quartiere: Quartiere; cella: Griglia },
): GameState {
  if (!cePropostaDiSpaccino(stato)) return stato
  if (stato.spaccini.some((s) => s.id === spaccino.id)) return stato

  return {
    ...stato,
    spaccini: [
      ...stato.spaccini,
      { ...spaccino, roba: {}, cassa: 0, daUltimoVersamento: 0 },
    ],
  }
}

/**
 * Lasciargli metà della roba.
 *
 * Metà è la regola: gli si affida quello che si ha addosso a metà, non una
 * quantità a scelta, perché è il rischio che si divide — quello che sta con lui
 * non te lo porta via un arresto, ma nemmeno lo vendi tu.
 */
export function affidaMetaDella(
  stato: GameState,
  id: string,
  droga: Droga,
): GameState {
  const spaccino = stato.spaccini.find((s) => s.id === id)
  if (!spaccino) return stato

  const meta = Math.floor(grammiDi(stato.giocatore.roba, droga) / 2)
  if (meta <= 0) return stato

  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      roba: conRoba(stato.giocatore.roba, droga, -meta),
    },
    spaccini: stato.spaccini.map((s) =>
      s.id === id ? { ...s, roba: conRoba(s.roba, droga, meta) } : s,
    ),
  }
}

/**
 * Il tempo che passa mentre loro lavorano.
 *
 * Vendono nella loro zona, ai prezzi della loro zona, e si tengono la loro
 * parte. Quando finiscono la roba smettono: nessuno va a rifornirsi da solo.
 */
export function avanzaSpaccini(stato: GameState, ore: number): GameState {
  if (stato.spaccini.length === 0 || ore <= 0) return stato

  return {
    ...stato,
    spaccini: stato.spaccini.map((s) => lavora(s, ore, stato.mercato.quotaClienti)),
  }
}

function lavora(spaccino: Spaccino, ore: number, quotaClienti: number): Spaccino {
  let roba = spaccino.roba
  let cassa = spaccino.cassa
  let daPiazzare = Math.floor(GRAMMI_ALL_ORA * ore * quotaClienti)

  for (const [droga, grammi] of Object.entries(roba) as [Droga, number][]) {
    if (daPiazzare <= 0) break

    const venduti = Math.min(grammi, daPiazzare)
    daPiazzare -= venduti
    roba = conRoba(roba, droga, -venduti)
    cassa += venduti * prezzoAlGrammo(droga, spaccino.quartiere) * (1 - SUA_PARTE)
  }

  return {
    ...spaccino,
    roba,
    cassa: arrotonda(cassa),
    daUltimoVersamento: spaccino.daUltimoVersamento + ore,
  }
}

/** Ha qualcosa da darti? Prima del versamento tiene i soldi in tasca sua. */
export function haDaVersare(spaccino: Spaccino): boolean {
  return spaccino.cassa > 0 && spaccino.daUltimoVersamento >= ORE_FRA_I_VERSAMENTI
}

/** Lo spaccino da cui si sta passando, se ce n'è uno. */
export function spaccinoAllaPortata(
  stato: GameState,
  posizione: Griglia,
): Spaccino | null {
  return (
    stato.spaccini.find(
      (s) =>
        Math.hypot(s.cella.x + 0.5 - posizione.x, s.cella.y + 0.5 - posizione.y) <=
        RAGGIO_RITIRO,
    ) ?? null
  )
}

/** Ritirare: si passa sopra e i soldi entrano in tasca, e nell'incasso totale. */
export function ritira(stato: GameState, id: string): GameState {
  const spaccino = stato.spaccini.find((s) => s.id === id)
  if (!spaccino || !haDaVersare(spaccino)) return stato

  return {
    ...incassa(stato, spaccino.cassa),
    spaccini: stato.spaccini.map((s) =>
      s.id === id ? { ...s, cassa: 0, daUltimoVersamento: 0 } : s,
    ),
  }
}

/** Quanta roba è fuori, in mano agli spaccini. */
export function robaAffidata(stato: GameState): number {
  return stato.spaccini.reduce((somma, s) => somma + grammiTotali(s.roba), 0)
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
