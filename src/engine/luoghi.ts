import type { Griglia } from './iso'

export type TipoLuogo = 'supermercato' | 'casa'

export interface Luogo {
  id: string
  nome: string
  tipo: TipoLuogo
  /** Angolo della cella in alto a sinistra dell'ingombro. */
  origine: Griglia
  larghezza: number
  profondita: number
  piani: number
  /** Se falso, l'edificio fa parte dell'arredo urbano e non si entra. */
  accessibile: boolean
  /**
   * La cella davanti alla porta, dove deve trovarsi il giocatore per entrare.
   * Sta fuori dall'ingombro, altrimenti sarebbe dentro il muro.
   */
  porta: Griglia
  /** Messaggio mostrato quando non si può entrare. */
  motivoChiusura?: string
}

/**
 * I luoghi della prima città.
 *
 * Scritti a mano invece che generati: due edifici riconoscibili valgono più di
 * cento palazzi anonimi. La città cresce aggiungendo voci qui.
 */
export const LUOGHI: Luogo[] = [
  {
    id: 'casa',
    nome: 'Casa',
    tipo: 'casa',
    origine: { x: 67, y: 63 },
    larghezza: 3,
    profondita: 3,
    piani: 2,
    accessibile: true,
    porta: { x: 68, y: 66 },
  },
  {
    id: 'supermercato',
    nome: 'Supermercato',
    tipo: 'supermercato',
    origine: { x: 82, y: 62 },
    larghezza: 5,
    profondita: 4,
    piani: 2,
    accessibile: false,
    porta: { x: 84, y: 66 },
    motivoChiusura: 'Chiuso',
  },
]

/** Le celle occupate da un luogo: sono muri, non ci si cammina. */
export function celleOccupate(luogo: Luogo): Griglia[] {
  const celle: Griglia[] = []
  for (let dy = 0; dy < luogo.profondita; dy++) {
    for (let dx = 0; dx < luogo.larghezza; dx++) {
      celle.push({ x: luogo.origine.x + dx, y: luogo.origine.y + dy })
    }
  }
  return celle
}

/** Distanza entro cui la porta risponde, in celle. */
export const RAGGIO_PORTA = 1.1

/**
 * Il luogo con cui il giocatore può interagire da dove si trova, se c'è.
 *
 * Restituisce anche i luoghi chiusi: sapere che il supermercato è chiuso è
 * un'informazione, mentre un edificio che non reagisce sembra un bug.
 */
export function luogoAllaPortata(
  posizione: Griglia,
  luoghi: Luogo[] = LUOGHI,
): Luogo | null {
  let piuVicino: Luogo | null = null
  let distanzaMinima = Infinity

  for (const luogo of luoghi) {
    // +0.5 perché la posizione del giocatore è al centro della cella.
    const dx = luogo.porta.x + 0.5 - posizione.x
    const dy = luogo.porta.y + 0.5 - posizione.y
    const distanza = Math.hypot(dx, dy)

    if (distanza <= RAGGIO_PORTA && distanza < distanzaMinima) {
      distanzaMinima = distanza
      piuVicino = luogo
    }
  }

  return piuVicino
}

export function luogoPerId(id: string, luoghi: Luogo[] = LUOGHI): Luogo {
  const trovato = luoghi.find((l) => l.id === id)
  if (!trovato) throw new Error(`Luogo sconosciuto: ${id}`)
  return trovato
}
