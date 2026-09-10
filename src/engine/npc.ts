import type { Griglia } from './iso'

/**
 * Le persone che stanno in città.
 *
 * Per ora sono ferme al loro posto: non hanno routine né conversazioni, ma
 * occupano una cella e si vedono. Metterle sulla mappa prima di dar loro un
 * comportamento serve a decidere dove vivono i mestieri — l'armiere lontano
 * dagli occhi, il venditore dove passa gente — e a vedere le proporzioni tra
 * i personaggi nel posto in cui verranno guardate.
 */

/** Da che parte guarda un personaggio fermo. */
export type Verso = 'fronte' | 'schiena' | 'sinistra' | 'destra'

export interface Npc extends Griglia {
  id: string
  nome: string
  /** Il foglio di sprite da usare, in `public/personaggi/`. */
  sprite: 'armiere' | 'venditore' | 'mafia' | 'capo'
  verso: Verso
  /** Quanto si allontana girovagando dal punto qui sopra, in celle. */
  raggio?: number
}

export const NPC: Npc[] = [
  {
    id: 'venditore',
    nome: 'Venditore',
    sprite: 'venditore',
    // Davanti al bazar del Tridente: è il primo volto che si incontra.
    x: 74,
    y: 27,
    verso: 'fronte',
  },
  {
    id: 'capo',
    nome: 'Capo della banda',
    sprite: 'capo',
    // Nel parchetto a nord-ovest: la banda lo tiene, ed è lì che si comincia.
    x: 15,
    y: 33,
    verso: 'sinistra',
  },
  {
    id: 'armiere',
    nome: 'Armiere',
    sprite: 'armiere',
    // Sulla soglia dell'armeria, fra le bandelle.
    x: 18,
    y: 22,
    verso: 'fronte',
  },
  {
    id: 'mafia',
    nome: 'Uomo in grigio',
    sprite: 'mafia',
    // Davanti al mercato nero, nel quartiere della mafia.
    x: 78,
    y: 56,
    verso: 'destra',
  },
]

/**
 * Chi parla con chi, e quanto ci si fida.
 *
 * La rete è diretta: l'armiere racconta al venditore quello che ha visto, non
 * viceversa. È poca roba, ma basta a far girare una voce da un quartiere
 * all'altro.
 */
export interface Relazione {
  a: string
  b: string
  /** Da 0 a 1: sotto un terzo non ci si racconta niente. */
  forza: number
}

export const RELAZIONI: Relazione[] = [
  { a: 'venditore', b: 'capo', forza: 0.5 },
  { a: 'capo', b: 'venditore', forza: 0.5 },
  { a: 'armiere', b: 'venditore', forza: 0.35 },
  { a: 'venditore', b: 'mafia', forza: 0.4 },
  { a: 'mafia', b: 'capo', forza: 0.3 },
]
