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
export const ARREDO: Arredo[] = [
  // Lampioni lungo la strada, alternati sui due marciapiedi.
  { x: 2, y: 9, tipo: 'lampione' },
  { x: 8, y: 12, tipo: 'lampione' },
  { x: 11, y: 9, tipo: 'lampione' },
  { x: 17, y: 12, tipo: 'lampione' },
  { x: 20, y: 9, tipo: 'lampione' },
  { x: 6, y: 6, tipo: 'lampione' },
  { x: 14, y: 16, tipo: 'lampione' },

  // Auto in sosta lungo il bordo della carreggiata.
  { x: 4, y: 11, tipo: 'auto' },
  { x: 9, y: 10, tipo: 'auto' },
  { x: 16, y: 11, tipo: 'auto' },
  { x: 19, y: 10, tipo: 'auto' },

  // Davanti al supermercato.
  { x: 4, y: 9, tipo: 'cassonetto' },
  { x: 9, y: 9, tipo: 'cassonetto' },

  // Panchine e verde.
  { x: 12, y: 9, tipo: 'panchina' },
  { x: 16, y: 12, tipo: 'panchina' },
  { x: 3, y: 13, tipo: 'cespuglio' },
  { x: 4, y: 14, tipo: 'cespuglio' },
  { x: 10, y: 16, tipo: 'cespuglio' },
  { x: 18, y: 6, tipo: 'cespuglio' },
  { x: 19, y: 5, tipo: 'cespuglio' },
  { x: 11, y: 18, tipo: 'cespuglio' },
]

export function arredoIn(x: number, y: number): Arredo | undefined {
  return ARREDO.find((a) => a.x === x && a.y === y)
}
