import type { Griglia } from './iso'
import { pianoStradale } from './strade'

export type TipoArredo =
  | 'lampione'
  | 'panchina'
  | 'cassonetto'
  | 'auto'
  | 'cespuglio'
  // Arredo di periferia: sono questi a raccontare il degrado.
  | 'bidone-fuoco'
  | 'rifiuti'
  | 'cartoni'
  | 'auto-rottame'
  | 'palo-storto'
  | 'panni'
  | 'muro'

export interface Arredo extends Griglia {
  tipo: TipoArredo
  /** Per i muri: quale dei quattro materiali usare. */
  variante?: number
  /**
   * Per i muri: verso quale asse corre il segmento.
   * Il disegno esiste in un verso solo e viene specchiato per l'altro.
   */
  specchiato?: boolean
}

/** Quali elementi sbarrano il passo. Un lampione è sottile, ci si passa accanto. */
const BLOCCA: Record<TipoArredo, boolean> = {
  lampione: false,
  panchina: true,
  cassonetto: true,
  auto: true,
  cespuglio: true,
  'bidone-fuoco': true,
  rifiuti: true,
  cartoni: true,
  'auto-rottame': true,
  // Pali e fili stanno in alto: ci si passa sotto.
  'palo-storto': false,
  panni: false,
  muro: true,
}

export function bloccaIlPasso(tipo: TipoArredo): boolean {
  return BLOCCA[tipo]
}

/**
 * Lampioni lungo le strade, a cadenza regolare.
 *
 * Ricavati dal piano stradale invece che elencati: seguono le strade dovunque
 * il piano le metta, e un elenco di centinaia di coordinate scritte a mano
 * sarebbe illeggibile e sbagliato al primo ritocco della maglia.
 *
 * Stanno sul filo esterno della carreggiata, che è dove il piano lascia il
 * marciapiede, e su un lato solo: illuminano lo stesso e costano metà.
 */
function lampioniSulleStrade(): Arredo[] {
  const pezzi: Arredo[] = []
  const piano = pianoStradale()

  const passo = (rango: string) => (rango === 'viale' ? 7 : 11)

  for (const s of piano.verticali) {
    if (s.rango === 'vicolo') continue
    const x = s.da - 1
    if (x < 0) continue
    for (let y = s.inizio + 4; y < s.fine - 2; y += passo(s.rango)) {
      pezzi.push({ x, y, tipo: 'lampione' })
    }
  }

  for (const s of piano.orizzontali) {
    if (s.rango === 'vicolo') continue
    const y = s.da - 1
    if (y < 0) continue
    for (let x = s.inizio + 6; x < s.fine - 2; x += passo(s.rango)) {
      pezzi.push({ x, y, tipo: 'lampione' })
    }
  }

  return pezzi
}

/**
 * L'arredo della periferia, disseminato fitto.
 *
 * Generato invece che elencato: sono decine di pezzi, e scriverli a mano
 * sarebbe un elenco illeggibile che nessuno riuscirebbe a modificare. La
 * scelta resta deterministica, quindi il quartiere non cambia aspetto a ogni
 * caricamento.
 */
function degradoDiPeriferia(): Arredo[] {
  const pezzi: Arredo[] = []

  // Confini della periferia, come dichiarati in quartieri.ts.
  const daX = 1
  const aX = 31
  const daY = 49
  const aY = 95

  const repertorio: TipoArredo[] = [
    'rifiuti',
    'cartoni',
    'rifiuti',
    'bidone-fuoco',
    'auto-rottame',
    'panni',
    'palo-storto',
    'rifiuti',
  ]

  for (let y = daY; y < aY; y++) {
    for (let x = daX; x < aX; x++) {
      const rumore = Math.sin(x * 33.17 + y * 71.53) * 12793.31
      const frazione = rumore - Math.floor(rumore)

      // Una cella su venti circa ospita qualcosa: il degrado si nota di più se
      // lascia respirare, mentre riempire tutto appiattisce la lettura.
      if (frazione > 0.055) continue

      const scelta = Math.floor((frazione / 0.055) * repertorio.length)
      pezzi.push({ x, y, tipo: repertorio[Math.min(scelta, repertorio.length - 1)] })
    }
  }

  return pezzi
}

/**
 * Recinzioni e muri di cinta della periferia.
 *
 * Chiudono qualche spiazzo lungo i vicoli: senza, i cortili sfumano l'uno
 * nell'altro e il quartiere sembra un unico spazio aperto invece di un
 * insieme di ritagli contesi.
 *
 * L'orientamento del segmento è dato dal verso in cui corre il muro; il
 * disegno esiste in un verso solo e viene specchiato per l'altro.
 */
function recinzioni(): Arredo[] {
  const pezzi: Arredo[] = []

  for (let y = 50; y < 94; y++) {
    for (let x = 2; x < 30; x++) {
      const rumore = Math.sin(x * 61.7 + y * 13.9) * 5417.19
      const frazione = rumore - Math.floor(rumore)
      if (frazione > 0.015) continue

      pezzi.push({
        x,
        y,
        tipo: 'muro',
        variante: Math.floor(frazione * 60) % 4,
        specchiato: frazione * 100 - Math.floor(frazione * 100) > 0.5,
      })
    }
  }

  return pezzi
}

export const ARREDO: Arredo[] = [
  ...lampioniSulleStrade(),
  ...degradoDiPeriferia(),
  ...recinzioni(),

  // Porto: cassonetti e mezzi fermi nei piazzali.
  { x: 16, y: 30, tipo: 'cassonetto' },
  { x: 22, y: 33, tipo: 'cassonetto' },
  { x: 19, y: 40, tipo: 'auto' },
  { x: 25, y: 37, tipo: 'auto' },

  // Centro storico: panchine e verde lungo le vie.
  { x: 40, y: 20, tipo: 'panchina' },
  { x: 47, y: 27, tipo: 'panchina' },
  { x: 52, y: 18, tipo: 'cespuglio' },
  { x: 44, y: 35, tipo: 'panchina' },
  { x: 51, y: 38, tipo: 'cespuglio' },

  // Zona ricca: verde curato attorno al parco.
  { x: 69, y: 20, tipo: 'cespuglio' },
  { x: 88, y: 18, tipo: 'cespuglio' },
  { x: 90, y: 30, tipo: 'panchina' },
  { x: 68, y: 34, tipo: 'panchina' },
  { x: 84, y: 8, tipo: 'auto' },

  // Zona notturna: auto in sosta davanti ai locali.
  { x: 40, y: 76, tipo: 'auto' },
  { x: 52, y: 82, tipo: 'auto' },
  { x: 46, y: 90, tipo: 'auto' },

  // Residenziale: giardini e auto nei vialetti.
  { x: 70, y: 58, tipo: 'cespuglio' },
  { x: 86, y: 63, tipo: 'cespuglio' },
  { x: 78, y: 78, tipo: 'auto' },
  { x: 69, y: 88, tipo: 'panchina' },
  { x: 90, y: 86, tipo: 'cespuglio' },
]
