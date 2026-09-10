import type { Griglia } from './iso'
import { LUOGHI, luogoAllaPortata, type Luogo } from './luoghi'
import { npcAllaPortata, type Npc } from './npc'
import type { Spaccino } from './spaccini'
import { mobileAllaPortata, sullUscita, type Interno, type Mobile } from './interni'

/**
 * L'azione disponibile da dove si trova il giocatore.
 *
 * È un tipo discriminato e non una stringa: entrare in un luogo e uscirne sono
 * azioni diverse, con dati diversi. Modellarle entrambe come `string | null`
 * significa prima o poi chiedere il nome del luogo a un valore che luogo non è.
 */
export type Interazione =
  | { tipo: 'entra'; luogo: Luogo }
  | { tipo: 'bottega'; luogo: Luogo }
  | { tipo: 'bloccato'; luogo: Luogo }
  | { tipo: 'parla'; npc: Npc }
  | { tipo: 'spaccino'; spaccino: Spaccino }
  | { tipo: 'esci' }
  | { tipo: 'mobile'; mobile: Mobile }
  | null

/** Cosa può fare il giocatore in città, da dove si trova. */
export function interazioneInCitta(
  posizione: Griglia,
  luoghi: Luogo[] = LUOGHI,
): Interazione {
  const luogo = luogoAllaPortata(posizione, luoghi)
  if (luogo) {
    if (!luogo.accessibile) return { tipo: 'bloccato', luogo }
    return luogo.bottega ? { tipo: 'bottega', luogo } : { tipo: 'entra', luogo }
  }

  // Le porte hanno la precedenza: chi sta davanti a una soglia vuole entrare,
  // anche se il tipo del bazar gli sta a due passi.
  const npc = npcAllaPortata(posizione)
  return npc ? { tipo: 'parla', npc } : null
}

/**
 * Cosa può fare il giocatore dentro casa.
 *
 * L'uscita ha la precedenza sui mobili: è l'unica azione che sposta di scena,
 * e trovarsela soffiata da un armadio vicino alla porta sarebbe una trappola.
 */
export function interazioneInInterno(
  interno: Interno,
  posizione: Griglia,
): Interazione {
  if (sullUscita(interno, posizione)) return { tipo: 'esci' }

  const mobile = mobileAllaPortata(interno, posizione)
  return mobile ? { tipo: 'mobile', mobile } : null
}

/**
 * Due interazioni descrivono la stessa possibilità?
 *
 * Serve per non riscrivere lo store a ogni frame: ogni scrittura fa
 * ri-renderizzare la UI, e la posizione del giocatore cambia di continuo mentre
 * l'azione disponibile resta la stessa.
 */
export function stessaInterazione(a: Interazione, b: Interazione): boolean {
  if (a === null || b === null) return a === b
  if (a.tipo !== b.tipo) return false

  if (a.tipo === 'esci') return true
  if (a.tipo === 'parla') return a.npc.id === (b as { npc: Npc }).npc.id
  if (a.tipo === 'spaccino') {
    const altro = b as { spaccino: Spaccino }
    return (
      a.spaccino.id === altro.spaccino.id &&
      // Cambia l'etichetta quando ha qualcosa da darti: va ridisegnata.
      a.spaccino.cassa === altro.spaccino.cassa
    )
  }
  if (a.tipo === 'mobile') {
    const altro = b as { mobile: Mobile }
    return (
      a.mobile.origine.x === altro.mobile.origine.x &&
      a.mobile.origine.y === altro.mobile.origine.y
    )
  }

  return a.luogo.id === (b as { luogo: Luogo }).luogo.id
}
