import type { Droga, GameState, Quartiere } from './state'
import { conRoba, drogaPerId, grammiDi } from './droga'
import { livelloPer } from './livello'
import { quartierePerId } from './quartieri'

/**
 * Vendere in giro.
 *
 * Tutto quello che sta qui è deterministico: il tiro di dado arriva da fuori,
 * come numero fra 0 e 1. Così una vendita si verifica con un test invece che
 * girando per la città a sperare che capiti il caso giusto.
 *
 * La regola che tiene in piedi il resto: più il quartiere è ricco, più si vende
 * e più si guadagna, ma più la polizia ti si accorge addosso.
 */

/** Probabilità di trovare un cliente in una zona qualunque, prima delle correzioni. */
const PROBABILITA_BASE = 0.35

/** Quanto un passante colpito costa in clientela: ne resta il 70%. */
const MALUS_PASSANTE = 0.7

/**
 * Il prezzo di strada al grammo.
 *
 * Nei quartieri ricchi la marijuana arriva a dieci euro al grammo, che è la
 * cifra che dice il tipo del bazar nella prima missione.
 */
export function prezzoAlGrammo(droga: Droga, quartiere: Quartiere): number {
  const { ricchezza } = quartierePerId(quartiere)
  return arrotonda(drogaPerId(droga).prezzoStrada * (0.6 + ricchezza * 0.9))
}

/**
 * Quanti grammi compra un cliente in questa zona.
 *
 * Nelle case dei ricchi si vende a tre grammi alla volta: trenta euro in un
 * colpo, come nelle note di design.
 */
export function grammiRichiesti(quartiere: Quartiere): number {
  return 1 + Math.round(quartierePerId(quartiere).ricchezza * 2)
}

/**
 * Quanto è probabile che il prossimo passante compri.
 *
 * Pesano tre cose: la ricchezza della zona, la socialità del protagonista e
 * quanta clientela si è già bruciata sparando in giro.
 */
export function probabilitaVendita(
  stato: GameState,
  quartiere: Quartiere,
): number {
  const { ricchezza } = quartierePerId(quartiere)
  const carisma = stato.giocatore.statistiche.socialita / 500

  const p =
    PROBABILITA_BASE * stato.mercato.quotaClienti * (0.7 + ricchezza * 0.6) +
    carisma

  return Math.min(0.95, Math.max(0, arrotonda(p)))
}

/**
 * Quanto è rischiosa una vendita qui, da 0 a 1.
 *
 * Non arresta nessuno da solo: è il numero che leggerà la polizia per decidere
 * se alzare il livello di ricerca. Le droghe pesanti pesano più dell'erba.
 */
export function rischioVendita(droga: Droga, quartiere: Quartiere): number {
  const { sorveglianza } = quartierePerId(quartiere)
  const gravita = drogaPerId(droga).fornitore === 'mafia' ? 1.6 : 1
  return Math.min(1, arrotonda(sorveglianza * gravita))
}

export type MotivoMancataVendita = 'senza-roba' | 'nessun-cliente'

export interface EsitoVendita {
  stato: GameState
  venduto: boolean
  grammi: number
  incasso: number
  /** Quanto la cosa è stata rischiosa: la polizia se ne servirà. */
  rischio: number
  motivo?: MotivoMancataVendita
}

/**
 * Provare a vendere al prossimo passante.
 *
 * `tiro` è un numero fra 0 e 1 tirato da chi chiama: sotto la probabilità si
 * vende, sopra il cliente tira dritto.
 */
export function vendi(
  stato: GameState,
  quartiere: Quartiere,
  droga: Droga,
  tiro: number,
): EsitoVendita {
  const rischio = rischioVendita(droga, quartiere)
  const inTasca = grammiDi(stato.giocatore.roba, droga)

  if (inTasca <= 0) {
    return { stato, venduto: false, grammi: 0, incasso: 0, rischio, motivo: 'senza-roba' }
  }

  if (tiro >= probabilitaVendita(stato, quartiere)) {
    return {
      stato,
      venduto: false,
      grammi: 0,
      incasso: 0,
      rischio,
      motivo: 'nessun-cliente',
    }
  }

  const grammi = Math.min(grammiRichiesti(quartiere), inTasca)
  const incasso = arrotonda(grammi * prezzoAlGrammo(droga, quartiere))

  const conMenoRoba: GameState = {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      roba: conRoba(stato.giocatore.roba, droga, -grammi),
    },
  }

  return { stato: incassa(conMenoRoba, incasso), venduto: true, grammi, incasso, rischio }
}

/**
 * Intascare.
 *
 * L'incasso totale non scende mai: è quello a decidere il livello, che è una
 * soglia raggiunta e non un saldo. Passa di qui anche quello che versano gli
 * spaccini.
 */
export function incassa(stato: GameState, importo: number): GameState {
  const preso = Math.max(0, arrotonda(importo))
  if (preso === 0) return stato

  const incassoTotale = arrotonda(stato.giocatore.incassoTotale + preso)

  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      contante: arrotonda(stato.giocatore.contante + preso),
      incassoTotale,
      livello: livelloPer(incassoTotale),
    },
  }
}

/**
 * Colpire un passante.
 *
 * Ogni volta la clientela in giro cala del 30%, e non torna: sparare nel mucchio
 * costa caro sul lungo periodo, che è l'unico freno a un gioco in cui si può
 * sparare a chiunque.
 */
export function colpisciPassante(stato: GameState): GameState {
  return {
    ...stato,
    mercato: {
      ...stato.mercato,
      quotaClienti: arrotonda(stato.mercato.quotaClienti * MALUS_PASSANTE),
    },
  }
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
