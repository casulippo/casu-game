import type { Griglia } from './iso'

export type TipoLuogo =
  | 'supermercato'
  | 'casa'
  | 'bazar'
  | 'armeria'
  | 'mercato-nero'

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
  /**
   * Le botteghe non si visitano: ci si serve dalla soglia.
   *
   * Bazar, armeria e mercato nero sono banconi, non stanze da esplorare: entrare
   * per premere un bottone e uscire sarebbe solo un giro in più.
   */
  bottega?: boolean
}

/**
 * I luoghi della prima città.
 *
 * Scritti a mano invece che generati: due edifici riconoscibili valgono più di
 * cento palazzi anonimi. La città cresce aggiungendo voci qui.
 *
 * Le posizioni seguono la mappa fissata nel design: casa e bazar del Tridente
 * nei palazzoni a nord-est, l'armeria del vecchietto in mezzo alle bandelle a
 * nord-ovest, il mercato nero nel quartiere della mafia a sud-est.
 */
export const LUOGHI: Luogo[] = [
  {
    id: 'casa',
    nome: 'Casa',
    tipo: 'casa',
    origine: { x: 67, y: 23 },
    larghezza: 3,
    profondita: 3,
    piani: 3,
    accessibile: true,
    porta: { x: 68, y: 26 },
  },
  {
    // Dietro le case a schiera dove abiti: il primo fornitore del gioco.
    id: 'bazar',
    nome: 'Bazar',
    tipo: 'bazar',
    origine: { x: 72, y: 23 },
    larghezza: 3,
    profondita: 3,
    piani: 2,
    accessibile: true,
    bottega: true,
    porta: { x: 73, y: 26 },
  },
  {
    id: 'armeria',
    nome: 'Armeria',
    tipo: 'armeria',
    origine: { x: 15, y: 19 },
    larghezza: 4,
    profondita: 3,
    piani: 2,
    accessibile: true,
    bottega: true,
    porta: { x: 16, y: 22 },
  },
  {
    id: 'mercato-nero',
    nome: 'Mercato nero',
    tipo: 'mercato-nero',
    origine: { x: 75, y: 53 },
    larghezza: 4,
    profondita: 3,
    piani: 2,
    accessibile: true,
    bottega: true,
    porta: { x: 76, y: 56 },
  },
  {
    id: 'supermercato',
    nome: 'Supermercato',
    tipo: 'supermercato',
    origine: { x: 9, y: 52 },
    larghezza: 5,
    profondita: 4,
    piani: 2,
    accessibile: false,
    porta: { x: 11, y: 56 },
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
