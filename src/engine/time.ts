import type { Tempo } from './state'

/** Un giorno di vita del personaggio dura 60 minuti reali. */
export const MINUTI_REALI_PER_GIORNO = 60

/** Quante ore di gioco passano in un secondo reale. */
export const ORE_GIOCO_PER_SECONDO_REALE =
  24 / (MINUTI_REALI_PER_GIORNO * 60)

/**
 * Fa avanzare il tempo di gioco di una certa quantità di ore.
 *
 * Gestisce il passaggio al giorno successivo, anche quando l'incremento
 * copre più giorni interi (utile per il sonno lungo o gli eventi narrativi).
 */
export function avanza(tempo: Tempo, oreGioco: number): Tempo {
  if (oreGioco < 0) throw new Error('Il tempo non torna indietro')

  const minutiTotali =
    tempo.giorno * 24 * 60 + tempo.ora * 60 + tempo.minuto + oreGioco * 60

  const minutiAssoluti = Math.floor(minutiTotali)

  return {
    giorno: Math.floor(minutiAssoluti / (24 * 60)),
    ora: Math.floor(minutiAssoluti / 60) % 24,
    minuto: minutiAssoluti % 60,
  }
}

/** Converte un delta di tempo reale (in millisecondi) in ore di gioco. */
export function oreDaTempoReale(deltaMs: number): number {
  return (deltaMs / 1000) * ORE_GIOCO_PER_SECONDO_REALE
}

/** Formatta l'ora come `08:05`, per la HUD. */
export function formattaOra(tempo: Tempo): string {
  const h = String(tempo.ora).padStart(2, '0')
  const m = String(tempo.minuto).padStart(2, '0')
  return `${h}:${m}`
}

export type FaseGiorno = 'notte' | 'mattina' | 'pomeriggio' | 'sera'

/** La fase del giorno, usata per l'illuminazione della mappa e le routine NPC. */
export function faseGiorno(tempo: Tempo): FaseGiorno {
  const { ora } = tempo
  if (ora < 6) return 'notte'
  if (ora < 13) return 'mattina'
  if (ora < 19) return 'pomeriggio'
  if (ora < 23) return 'sera'
  return 'notte'
}
