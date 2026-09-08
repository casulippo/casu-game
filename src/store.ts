import { create } from 'zustand'
import { statoIniziale, type GameState, type Quartiere } from './engine/state'
import { avanza } from './engine/time'
import { stessaInterazione, type Interazione } from './engine/interazione'

/** Dove si trova il giocatore: per strada, o dentro un luogo. */
export type Ambiente = 'citta' | 'interno'

/**
 * L'unico ponte tra la logica di gioco, il canvas Phaser e la UI React.
 *
 * Phaser scrive qui (il tempo che scorre, dove si trova il giocatore),
 * React si sottoscrive e si ridisegna da solo. I due strati non si parlano
 * mai direttamente: è l'equivalente tipizzato dei signal di Godot.
 */
interface GameStore extends GameState {
  ambiente: Ambiente
  /** Il luogo in cui si è entrati, se siamo dentro. */
  luogoCorrente: string | null
  /**
   * L'azione disponibile da dove si trova il giocatore.
   *
   * Aggiornata dalla scena solo quando cambia davvero, non a ogni frame:
   * ogni scrittura qui fa ri-renderizzare la UI.
   */
  interazione: Interazione

  avanzaTempo: (oreGioco: number) => void
  vaiA: (quartiere: Quartiere) => void
  entraIn: (luogoId: string) => void
  esci: () => void
  segnalaInterazione: (interazione: Interazione) => void
  reset: () => void
  carica: (stato: GameState) => void
}

export const useGame = create<GameStore>()((set) => ({
  ...statoIniziale(),
  ambiente: 'citta',
  luogoCorrente: null,
  interazione: null,

  avanzaTempo: (oreGioco) =>
    set((s) => ({ tempo: avanza(s.tempo, oreGioco) })),

  vaiA: (quartiere) => set({ quartiereCorrente: quartiere }),

  entraIn: (luogoId) =>
    set({ ambiente: 'interno', luogoCorrente: luogoId, interazione: null }),

  esci: () => set({ ambiente: 'citta', luogoCorrente: null, interazione: null }),

  segnalaInterazione: (interazione) =>
    set((s) =>
      stessaInterazione(s.interazione, interazione) ? s : { interazione },
    ),

  reset: () =>
    set({
      ...statoIniziale(),
      ambiente: 'citta',
      luogoCorrente: null,
      interazione: null,
    }),

  carica: (stato) => set(stato),
}))

/** Accesso allo stato fuori da React, per Phaser. */
export const gameStore = useGame
