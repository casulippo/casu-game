import type { GameState, Statistiche } from './state'
import { strumentoPerId } from './strumenti'

/**
 * Le statistiche che contano davvero.
 *
 * Quelle scritte nello stato sono la base: crescono mangiando bene e non si
 * toccano per nessun altro motivo. Sopra ci passano due correzioni — quello che
 * si ha addosso, e quanta fame si ha — e il risultato è quello che leggono il
 * combattimento e la vendita.
 *
 * Tenerle separate significa che togliersi il giubbotto o fare un pasto non
 * lascia residui da scalare a mano.
 */

/** Sopra questa fame si comincia a stare male. */
export const FAME_CHE_PESA = 70

/** Quanto si arriva a perdere, in proporzione, a stomaco vuoto del tutto. */
const PENALITA_MASSIMA = 0.35

/**
 * Quanto pesa la fame adesso, da 0 (sazio abbastanza) a 1 (allo stremo).
 *
 * Sotto la soglia non pesa affatto: fino a lì è appetito, non digiuno.
 */
export function penalitaDaFame(stato: GameState): number {
  const oltre = stato.fame.livello - FAME_CHE_PESA
  if (oltre <= 0) return 0
  return arrotonda((oltre / (100 - FAME_CHE_PESA)) * PENALITA_MASSIMA)
}

export function statisticheEffettive(stato: GameState): Statistiche {
  const conStrumenti = stato.giocatore.strumenti.reduce<Statistiche>(
    (somma, id) => {
      const { bonus } = strumentoPerId(id)
      return {
        mira: somma.mira + (bonus.mira ?? 0),
        vita: somma.vita + (bonus.vita ?? 0),
        socialita: somma.socialita + (bonus.socialita ?? 0),
        bellezza: somma.bellezza + (bonus.bellezza ?? 0),
      }
    },
    { ...stato.giocatore.statistiche },
  )

  const fattore = 1 - penalitaDaFame(stato)

  return {
    mira: arrotonda(conStrumenti.mira * fattore),
    vita: arrotonda(conStrumenti.vita * fattore),
    socialita: arrotonda(conStrumenti.socialita * fattore),
    bellezza: arrotonda(conStrumenti.bellezza * fattore),
  }
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
