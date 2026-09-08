import type { Griglia } from './iso'

export type TipoArredo =
  | 'lampione'
  | 'panchina'
  | 'cassonetto'
  | 'auto'
  | 'cespuglio'

export interface Arredo extends Griglia {
  tipo: TipoArredo
}

/** Quali elementi sbarrano il passo. Un lampione è sottile, ci si passa accanto. */
const BLOCCA: Record<TipoArredo, boolean> = {
  lampione: false,
  panchina: true,
  cassonetto: true,
  auto: true,
  cespuglio: true,
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

export const ARREDO: Arredo[] = [
  ...lampioniSulleArterie(),

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
