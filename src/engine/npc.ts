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
}

export const NPC: Npc[] = [
  {
    id: 'venditore',
    nome: 'Venditore',
    sprite: 'venditore',
    // Sul marciapiede davanti a casa: è il primo volto che si incontra.
    x: 70,
    y: 66,
    verso: 'fronte',
  },
  {
    id: 'capo',
    nome: 'Capo della banda',
    sprite: 'capo',
    // Nel parco della zona notturna: la banda tiene il parchetto, appunto.
    x: 43,
    y: 65,
    verso: 'sinistra',
  },
  {
    id: 'armiere',
    nome: 'Armiere',
    sprite: 'armiere',
    // Sul marciapiede dei piazzali del porto, lontano dal centro.
    x: 18,
    y: 29,
    verso: 'fronte',
  },
  {
    id: 'mafia',
    nome: 'Uomo in grigio',
    sprite: 'mafia',
    // Sul viale del centro storico, dove sta chi non ha fretta.
    x: 46,
    y: 30,
    verso: 'destra',
  },
]
