import { create } from 'zustand'
import { statoIniziale, type GameState, type Quartiere } from './engine/state'
import { avanza } from './engine/time'

/**
 * L'unico ponte tra la logica di gioco, il canvas Phaser e la UI React.
 *
 * Phaser scrive qui (il tempo che scorre, la posizione del giocatore),
 * React si sottoscrive e si ridisegna da solo. I due strati non si parlano
 * mai direttamente: è l'equivalente tipizzato dei signal di Godot.
 */
interface GameStore extends GameState {
  /** Fa scorrere il tempo. Chiamato dal game loop di Phaser. */
  avanzaTempo: (oreGioco: number) => void
  /** Cambia quartiere (viaggio a piedi o rapido). */
  vaiA: (quartiere: Quartiere) => void
  /** Ricomincia da capo. */
  reset: () => void
  /** Sostituisce lo stato, per il caricamento di un salvataggio. */
  carica: (stato: GameState) => void
}

export const useGame = create<GameStore>()((set) => ({
  ...statoIniziale(),

  avanzaTempo: (oreGioco) =>
    set((s) => ({ tempo: avanza(s.tempo, oreGioco) })),

  vaiA: (quartiere) => set({ quartiereCorrente: quartiere }),

  reset: () => set(statoIniziale()),

  carica: (stato) => set(stato),
}))

/** Accesso allo stato fuori da React, per Phaser. */
export const gameStore = useGame
