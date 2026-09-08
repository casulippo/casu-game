import type { Griglia } from './iso'

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
 * L'arredo urbano, posizionato a mano.
 *
 * Sono i dettagli che distinguono una città da una griglia: lampioni lungo la
 * carreggiata, auto in sosta, panchine sul verde.
 */
/**
 * Lampioni lungo le arterie principali, a cadenza regolare.
 * Generati invece che elencati: sono decine, e a mano sarebbero solo rumore.
 */
function lampioniSulleArterie(): Arredo[] {
  const pezzi: Arredo[] = []

  // Lungo le due arterie verticali.
  for (const x of [17, 33]) {
    for (let y = 4; y < 48; y += 6) pezzi.push({ x, y, tipo: 'lampione' })
  }
  // Lungo quelle orizzontali.
  for (const y of [15, 23, 33]) {
    for (let x = 4; x < 48; x += 7) pezzi.push({ x, y, tipo: 'lampione' })
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
  const aX = 17
  const daY = 15
  const aY = 47

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

      // Circa una cella su dieci ospita qualcosa: il degrado si nota di più
      // se lascia respirare, mentre riempire tutto appiattisce la lettura.
      if (frazione > 0.1) continue

      const scelta = Math.floor((frazione / 0.1) * repertorio.length)
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

  for (let y = 16; y < 46; y++) {
    for (let x = 2; x < 16; x++) {
      const rumore = Math.sin(x * 61.7 + y * 13.9) * 5417.19
      const frazione = rumore - Math.floor(rumore)
      if (frazione > 0.03) continue

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
  ...lampioniSulleArterie(),
  ...degradoDiPeriferia(),
  ...recinzioni(),

  // Porto: cassonetti e mezzi fermi nei piazzali.
  { x: 6, y: 8, tipo: 'cassonetto' },
  { x: 10, y: 9, tipo: 'cassonetto' },
  { x: 8, y: 13, tipo: 'auto' },
  { x: 13, y: 11, tipo: 'auto' },

  // Periferia: degrado e auto abbandonate.
  { x: 5, y: 21, tipo: 'cassonetto' },
  { x: 9, y: 27, tipo: 'cassonetto' },
  { x: 4, y: 33, tipo: 'auto' },
  { x: 11, y: 39, tipo: 'auto' },
  { x: 7, y: 44, tipo: 'cassonetto' },

  // Centro storico: panchine e verde attorno alle piazze.
  { x: 21, y: 17, tipo: 'panchina' },
  { x: 26, y: 21, tipo: 'panchina' },
  { x: 29, y: 17, tipo: 'cespuglio' },
  { x: 22, y: 27, tipo: 'panchina' },
  { x: 27, y: 29, tipo: 'cespuglio' },

  // Zona notturna: auto in sosta davanti ai locali.
  { x: 21, y: 35, tipo: 'auto' },
  { x: 27, y: 39, tipo: 'auto' },
  { x: 24, y: 44, tipo: 'auto' },

  // Zona ricca: verde curato.
  { x: 37, y: 5, tipo: 'cespuglio' },
  { x: 40, y: 9, tipo: 'cespuglio' },
  { x: 44, y: 13, tipo: 'panchina' },
  { x: 38, y: 17, tipo: 'panchina' },
  { x: 43, y: 4, tipo: 'auto' },

  // Residenziale: giardini e auto nei vialetti.
  { x: 37, y: 29, tipo: 'cespuglio' },
  { x: 44, y: 27, tipo: 'cespuglio' },
  { x: 41, y: 39, tipo: 'auto' },
  { x: 36, y: 44, tipo: 'panchina' },
  { x: 45, y: 43, tipo: 'cespuglio' },
]

export function arredoIn(x: number, y: number): Arredo | undefined {
  return ARREDO.find((a) => a.x === x && a.y === y)
}
