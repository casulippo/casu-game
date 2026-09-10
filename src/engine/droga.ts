import type { Droga, GameState, Inventario } from './state'
import { tettoBazar } from './livello'

/**
 * La merce: cosa si compra, da chi, e a quanto.
 *
 * I prezzi qui dentro sono al grammo e sono prezzi d'acquisto. Quanto si rivende
 * dipende dal quartiere, e quello lo decide `spaccio.ts`.
 */

export type Fornitore = 'bazar' | 'mafia'

export interface DatiDroga {
  id: Droga
  nome: string
  fornitore: Fornitore
  /**
   * Quanto bisogna aver incassato perché il fornitore la tiri fuori.
   *
   * `null` vuol dire che non è questione di soldi ma di storia: le droghe
   * pesanti si sbloccano conoscendo la mafia, non arricchendosi.
   */
  sbloccoIncasso: number | null
  /** Prezzo d'acquisto al grammo, in euro. */
  prezzoAcquisto: number
  /** Prezzo base di strada al grammo: il quartiere lo alza o lo abbassa. */
  prezzoStrada: number
}

export const DROGHE: DatiDroga[] = [
  {
    id: 'marijuana',
    nome: 'Marijuana',
    fornitore: 'bazar',
    sbloccoIncasso: 0,
    prezzoAcquisto: 4,
    prezzoStrada: 8,
  },
  {
    id: 'md',
    nome: 'MD',
    fornitore: 'bazar',
    sbloccoIncasso: 5_000,
    prezzoAcquisto: 20,
    prezzoStrada: 35,
  },
  {
    id: 'lsd',
    nome: 'LSD',
    fornitore: 'bazar',
    sbloccoIncasso: 20_000,
    prezzoAcquisto: 25,
    prezzoStrada: 45,
  },
  {
    id: 'cocaina',
    nome: 'Cocaina',
    fornitore: 'mafia',
    sbloccoIncasso: null,
    prezzoAcquisto: 45,
    prezzoStrada: 80,
  },
  {
    id: 'crack',
    nome: 'Crack',
    fornitore: 'mafia',
    sbloccoIncasso: null,
    prezzoAcquisto: 30,
    prezzoStrada: 55,
  },
  {
    id: 'eroina',
    nome: 'Eroina',
    fornitore: 'mafia',
    sbloccoIncasso: null,
    prezzoAcquisto: 40,
    prezzoStrada: 70,
  },
]

export function drogaPerId(id: Droga): DatiDroga {
  const trovata = DROGHE.find((d) => d.id === id)
  if (!trovata) throw new Error(`Droga sconosciuta: ${id}`)
  return trovata
}

/** Cosa il bazar del Tridente tira fuori, con quello che si è incassato finora. */
export function drogheAlBazar(incassoTotale: number): DatiDroga[] {
  return DROGHE.filter(
    (d) =>
      d.fornitore === 'bazar' &&
      d.sbloccoIncasso !== null &&
      incassoTotale >= d.sbloccoIncasso,
  )
}

/** Quanti grammi si hanno addosso di questo tipo. */
export function grammiDi(inventario: Inventario, droga: Droga): number {
  return inventario[droga] ?? 0
}

/** Tutti i grammi addosso, di qualunque tipo. */
export function grammiTotali(inventario: Inventario): number {
  return DROGHE.reduce((somma, d) => somma + grammiDi(inventario, d.id), 0)
}

/** Aggiunge roba all'inventario. Grammi negativi la tolgono, mai sotto zero. */
export function conRoba(
  inventario: Inventario,
  droga: Droga,
  grammi: number,
): Inventario {
  const nuovi = Math.max(0, arrotonda(grammiDi(inventario, droga) + grammi))
  const aggiornato = { ...inventario, [droga]: nuovi }
  if (nuovi === 0) delete aggiornato[droga]
  return aggiornato
}

export interface EsitoAcquisto {
  stato: GameState
  /** Quanti grammi sono stati davvero venduti: il tetto e i soldi possono tagliarli. */
  grammi: number
  spesa: number
  motivo: 'ok' | 'non-disponibile' | 'tetto-raggiunto' | 'senza-soldi'
}

/**
 * Comprare al bazar del Tridente.
 *
 * Tre cose possono tagliare l'ordine: la roba non ancora sbloccata, il tetto
 * giornaliero — che si azzera solo tornando a casa a dormire — e il contante in
 * tasca. Quando il taglio è parziale si compra quel che si può: mandare via il
 * giocatore a mani vuote per un grammo di troppo sarebbe solo fastidioso.
 */
export function acquistaAlBazar(
  stato: GameState,
  droga: Droga,
  grammi: number,
  prezzoAlGrammo = drogaPerId(droga).prezzoAcquisto,
): EsitoAcquisto {
  const g = stato.giocatore
  const invenduto = { stato, grammi: 0, spesa: 0 } as const

  if (!drogheAlBazar(g.incassoTotale).some((d) => d.id === droga)) {
    return { ...invenduto, motivo: 'non-disponibile' }
  }

  const residuo = tettoBazar(g.livello) - stato.mercato.grammiPresiOggi
  if (residuo <= 0) return { ...invenduto, motivo: 'tetto-raggiunto' }

  const perIlTetto = Math.min(Math.max(0, Math.floor(grammi)), residuo)
  const perLaTasca = Math.min(perIlTetto, Math.floor(g.contante / prezzoAlGrammo))
  if (perLaTasca <= 0) {
    return { ...invenduto, motivo: perIlTetto <= 0 ? 'tetto-raggiunto' : 'senza-soldi' }
  }

  const spesa = arrotonda(perLaTasca * prezzoAlGrammo)

  return {
    stato: {
      ...stato,
      giocatore: {
        ...g,
        contante: arrotonda(g.contante - spesa),
        roba: conRoba(g.roba, droga, perLaTasca),
      },
      mercato: {
        ...stato.mercato,
        grammiPresiOggi: stato.mercato.grammiPresiOggi + perLaTasca,
      },
    },
    grammi: perLaTasca,
    spesa,
    motivo: 'ok',
  }
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
