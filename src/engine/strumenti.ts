import type { Statistiche } from './state'

/**
 * Gli strumenti.
 *
 * Si comprano al mercato nero, nel quartiere della mafia, e alzano le
 * statistiche. Non sono consumabili: quello che si è comprato resta addosso, e
 * il bonus vale finché ce l'hai.
 *
 * Le statistiche del giocatore restano quelle base: il bonus si somma quando
 * serve, così togliere un oggetto non lascia residui da scalare a mano.
 */

export type TipoStrumento =
  | 'giubbotto'
  | 'guanti'
  | 'anfibi'
  | 'catena'
  | 'telefono'

export interface DatiStrumento {
  id: TipoStrumento
  nome: string
  prezzo: number
  /** Quanto aggiunge a ciascuna statistica. */
  bonus: Partial<Statistiche>
}

export const STRUMENTI: DatiStrumento[] = [
  {
    id: 'giubbotto',
    nome: 'Giubbotto antiproiettile',
    prezzo: 1_200,
    bonus: { vita: 40 },
  },
  {
    id: 'guanti',
    nome: 'Guanti da tiro',
    prezzo: 600,
    bonus: { mira: 15 },
  },
  {
    id: 'anfibi',
    nome: 'Anfibi',
    prezzo: 350,
    bonus: { vita: 10 },
  },
  {
    id: 'catena',
    nome: "Catena d'oro",
    prezzo: 900,
    bonus: { bellezza: 20 },
  },
  {
    id: 'telefono',
    nome: 'Telefono nuovo',
    prezzo: 450,
    bonus: { socialita: 15 },
  },
]

export function strumentoPerId(id: TipoStrumento): DatiStrumento {
  const trovato = STRUMENTI.find((s) => s.id === id)
  if (!trovato) throw new Error(`Strumento sconosciuto: ${id}`)
  return trovato
}
