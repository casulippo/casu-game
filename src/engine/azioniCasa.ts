import type { Fame, GameState, Giocatore, Sonno } from './state'
import { FAME_PER_ORA } from './state'
import { avanza } from './time'

/**
 * Cosa succede quando si dorme, si mangia o si mette via il contante.
 *
 * Funzioni pure che prendono lo stato e ne restituiscono uno nuovo: le regole
 * di cosa costa un'ora di sonno o un pasto si verificano coi test, senza
 * aprire il gioco. Lo store si limita a sostituire lo stato con quello che
 * torna da qui.
 */

/** Quante ore di sonno servono a notte per non accumulare debito. */
export const FABBISOGNO_SONNO = 7

/** Quanto dura un pasto, in ore di gioco: il conto è quello del brief. */
export const ORE_PASTO = 1

/** Di quanto un pasto sazia. */
const SAZIETA_PASTO = 45

/**
 * Dormire.
 *
 * Il debito scende di quanto si dorme oltre il fabbisogno e sale se si dorme
 * meno: è cumulativo, quindi tre notti da quattro ore pesano come una notte in
 * bianco. Nel frattempo il tempo passa e la fame cresce — ci si sveglia
 * affamati, che è il punto.
 */
export function dormi(stato: GameState, ore: number): GameState {
  const dormite = Math.max(0, ore)

  const sonno: Sonno = {
    debito: Math.max(0, stato.sonno.debito - (dormite - FABBISOGNO_SONNO)),
  }

  return {
    ...stato,
    sonno,
    fame: cresceLaFame(stato.fame, dormite),
    tempo: avanza(stato.tempo, dormite),
  }
}

/** Mangiare: sazia, costa un'ora, e non toglie il sonno arretrato. */
export function mangia(stato: GameState): GameState {
  return {
    ...stato,
    fame: { livello: arrotonda(Math.max(0, stato.fame.livello - SAZIETA_PASTO)) },
    tempo: avanza(stato.tempo, ORE_PASTO),
  }
}

/**
 * Mettere via il contante in casa.
 *
 * Si nasconde prima lo sporco: è quello che scotta. Quel che resta da
 * nascondere lo si prende dai soldi puliti.
 */
export function nascondiSoldi(stato: GameState, importo: number): GameState {
  const richiesto = Math.max(0, Math.floor(importo))
  const daSporchi = Math.min(richiesto, stato.giocatore.soldiSporchi)
  const daPuliti = Math.min(richiesto - daSporchi, stato.giocatore.soldiPuliti)
  const nascosti = daSporchi + daPuliti

  if (nascosti === 0) return stato

  const giocatore: Giocatore = {
    ...stato.giocatore,
    soldiSporchi: stato.giocatore.soldiSporchi - daSporchi,
    soldiPuliti: stato.giocatore.soldiPuliti - daPuliti,
    soldiNascosti: stato.giocatore.soldiNascosti + nascosti,
  }

  return { ...stato, giocatore }
}

/** Riprendere il contante dal nascondiglio: torna tra i soldi puliti. */
export function riprendiSoldi(stato: GameState, importo: number): GameState {
  const preso = Math.min(
    Math.max(0, Math.floor(importo)),
    stato.giocatore.soldiNascosti,
  )
  if (preso === 0) return stato

  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      soldiNascosti: stato.giocatore.soldiNascosti - preso,
      soldiPuliti: stato.giocatore.soldiPuliti + preso,
    },
  }
}

/** Quanto contante si ha addosso, ed è quindi nascondibile. */
export function contanteAddosso(stato: GameState): number {
  return stato.giocatore.soldiPuliti + stato.giocatore.soldiSporchi
}

export function cresceLaFame(fame: Fame, ore: number): Fame {
  return { livello: arrotonda(Math.min(100, fame.livello + ore * FAME_PER_ORA)) }
}

/** Due decimali bastano: la fame si mostra come percentuale intera. */
function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
