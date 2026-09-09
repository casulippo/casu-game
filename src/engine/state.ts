/**
 * Il modello dati del gioco.
 *
 * Regola fondamentale: questo file, e tutto il resto di `engine/`, non conosce
 * il DOM né il canvas. Sono tipi e funzioni pure, testabili senza aprire il gioco.
 */

export type Quartiere =
  | 'centro'
  | 'porto'
  | 'periferia'
  | 'residenziale'
  | 'ricca'
  | 'notturna'

export type Background = 'immigrati' | 'strada' | 'benestante'

export interface Giocatore {
  nome: string
  background: Background
  eta: number
  soldiPuliti: number
  soldiSporchi: number
  /**
   * Il contante messo via in casa.
   *
   * Tenuto separato dal resto perché è l'unico che una perquisizione può
   * trovare: quando arriveranno le indagini, sarà questo il mucchio a rischio.
   */
  soldiNascosti: number
  reputazioneLegale: number
  reputazioneStrada: number
  livelloRicerca: 0 | 1 | 2 | 3 | 4
}

/** Il tempo di gioco. Un giorno di vita del personaggio = 60 minuti reali. */
export interface Tempo {
  /** Giorni trascorsi dall'inizio della partita. */
  giorno: number
  /** Ora del giorno, 0-23. */
  ora: number
  /** Minuti dell'ora corrente, 0-59. */
  minuto: number
}

/**
 * Debito di sonno accumulato. Cumulativo: tre notti da 4 ore pesano
 * quanto una notte in bianco.
 */
export interface Sonno {
  /** Ore di sonno mancanti rispetto al fabbisogno. */
  debito: number
}

/**
 * Quanto si ha fame, da 0 (sazio) a 100 (allo stremo).
 *
 * Cresce col tempo che passa, non con i passi: restare fermi non salva dalla
 * fame. Il brief conta un pasto come un'ora di gioco.
 */
export interface Fame {
  livello: number
}

/** Di quanto cresce la fame per ogni ora di gioco. */
export const FAME_PER_ORA = 3.5

/** Lo stato completo della partita. È questo che viene salvato. */
export interface GameState {
  giocatore: Giocatore
  tempo: Tempo
  sonno: Sonno
  fame: Fame
  quartiereCorrente: Quartiere
}

const SOLDI_INIZIALI: Record<Background, number> = {
  immigrati: 150,
  strada: 40,
  benestante: 800,
}

export function statoIniziale(
  nome = 'Casu',
  background: Background = 'strada',
): GameState {
  return {
    giocatore: {
      nome,
      background,
      eta: 16,
      soldiPuliti: SOLDI_INIZIALI[background],
      soldiSporchi: 0,
      soldiNascosti: 0,
      reputazioneLegale: 0,
      reputazioneStrada: 0,
      livelloRicerca: 0,
    },
    tempo: { giorno: 1, ora: 8, minuto: 0 },
    sonno: { debito: 0 },
    fame: { livello: 20 },
    quartiereCorrente: 'periferia',
  }
}
