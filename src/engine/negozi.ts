import type { GameState } from './state'
import { ARMI, armaPerId, type DatiArma, type TipoArma } from './armi'
import { STRUMENTI, strumentoPerId, type DatiStrumento, type TipoStrumento } from './strumenti'

/**
 * I banconi della città.
 *
 * Il bazar del Tridente vende la roba ed è in `droga.ts`, dove sta anche il suo
 * tetto giornaliero. Qui ci sono gli altri due: l'armeria del vecchietto e il
 * mercato nero della mafia.
 */

/**
 * Quanti favori servono all'armiere prima di tirare fuori un'arma.
 *
 * La pistola non si compra: la regala lui dopo il parchetto. Il resto arriva
 * mano a mano che il quartiere diventa tranquillo — che è il patto su cui si
 * regge tutto il rapporto.
 */
const FAVORI_RICHIESTI: Record<TipoArma, number> = {
  coltello: 0,
  pistola: 0,
  mitraglietta: 2,
  fucile: 4,
}

/** Quanto sconta ogni favore, e fin dove può arrivare lo sconto. */
const SCONTO_PER_FAVORE = 0.08
const SCONTO_MASSIMO = 0.4

/** Quello che l'armiere è disposto a vendere, adesso. */
export function armiInVendita(stato: GameState): DatiArma[] {
  return ARMI.filter(
    (a) =>
      a.prezzo > 0 &&
      !stato.giocatore.armi.includes(a.id) &&
      stato.armeria.favori >= FAVORI_RICHIESTI[a.id],
  )
}

/**
 * Il prezzo che fa a te.
 *
 * Più la zona è tranquilla, più scende: è il modo dell'armiere di pagare i
 * favori senza mai dare soldi.
 */
export function prezzoArmeria(stato: GameState, arma: TipoArma): number {
  const sconto = Math.min(SCONTO_MASSIMO, stato.armeria.favori * SCONTO_PER_FAVORE)
  return Math.round(armaPerId(arma).prezzo * (1 - sconto))
}

export type EsitoAcquistoOggetto = 'ok' | 'non-disponibile' | 'senza-soldi' | 'gia-tua'

export interface Acquisto {
  stato: GameState
  esito: EsitoAcquistoOggetto
  spesa: number
}

export function compraArma(stato: GameState, arma: TipoArma): Acquisto {
  if (stato.giocatore.armi.includes(arma)) {
    return { stato, esito: 'gia-tua', spesa: 0 }
  }
  if (!armiInVendita(stato).some((a) => a.id === arma)) {
    return { stato, esito: 'non-disponibile', spesa: 0 }
  }

  const prezzo = prezzoArmeria(stato, arma)
  if (stato.giocatore.contante < prezzo) {
    return { stato, esito: 'senza-soldi', spesa: 0 }
  }

  return {
    stato: {
      ...sbloccaArma(
        { ...stato, giocatore: { ...stato.giocatore, contante: stato.giocatore.contante - prezzo } },
        arma,
      ),
    },
    esito: 'ok',
    spesa: prezzo,
  }
}

/**
 * Avere un'arma senza pagarla.
 *
 * Serve alla storia: la pistola del vecchietto è un regalo, non un acquisto, e
 * chi la riceve se la ritrova già in mano.
 */
export function sbloccaArma(stato: GameState, arma: TipoArma): GameState {
  if (stato.giocatore.armi.includes(arma)) return stato

  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      armi: [...stato.giocatore.armi, arma],
      arma,
    },
  }
}

/** Cambiare arma fra quelle che si hanno. */
export function impugna(stato: GameState, arma: TipoArma): GameState {
  if (!stato.giocatore.armi.includes(arma)) return stato
  return { ...stato, giocatore: { ...stato.giocatore, arma } }
}

/** Un favore fatto all'armiere: prezzi più bassi e roba migliore. */
export function unFavoreAllArmiere(stato: GameState): GameState {
  return { ...stato, armeria: { favori: stato.armeria.favori + 1 } }
}

/** Il mercato nero della mafia: quello che non si ha ancora. */
export function strumentiInVendita(stato: GameState): DatiStrumento[] {
  return STRUMENTI.filter((s) => !stato.giocatore.strumenti.includes(s.id))
}

export function compraStrumento(stato: GameState, id: TipoStrumento): Acquisto {
  if (stato.giocatore.strumenti.includes(id)) {
    return { stato, esito: 'gia-tua', spesa: 0 }
  }

  const prezzo = strumentoPerId(id).prezzo
  if (stato.giocatore.contante < prezzo) {
    return { stato, esito: 'senza-soldi', spesa: 0 }
  }

  return {
    stato: {
      ...stato,
      giocatore: {
        ...stato.giocatore,
        contante: stato.giocatore.contante - prezzo,
        strumenti: [...stato.giocatore.strumenti, id],
      },
    },
    esito: 'ok',
    spesa: prezzo,
  }
}
