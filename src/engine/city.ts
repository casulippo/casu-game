import type { Griglia } from './iso'

export type Cella = 'strada' | 'marciapiede' | 'edificio' | 'parco'

export const LATO_CITTA = 28

/** Ogni quanto passa una strada. */
const PASSO_ISOLATO = 7

/**
 * Genera l'isolato di prova: una griglia di strade con edifici in mezzo.
 *
 * Provvisorio. Quando arriveranno gli asset, la mappa sarà autorata in Tiled e
 * caricata da JSON — ma il tipo `Cella[][]` e le funzioni sotto restano identici,
 * quindi il resto del codice non se ne accorgerà.
 */
export function generaCitta(lato = LATO_CITTA): Cella[][] {
  const mappa: Cella[][] = []

  for (let y = 0; y < lato; y++) {
    const riga: Cella[] = []
    for (let x = 0; x < lato; x++) {
      riga.push(cellaIn(x, y, lato))
    }
    mappa.push(riga)
  }

  return mappa
}

function cellaIn(x: number, y: number, lato: number): Cella {
  const suStradaX = x % PASSO_ISOLATO === 0
  const suStradaY = y % PASSO_ISOLATO === 0

  if (suStradaX || suStradaY) return 'strada'

  const bordoIsolato =
    x % PASSO_ISOLATO === 1 ||
    y % PASSO_ISOLATO === 1 ||
    x % PASSO_ISOLATO === PASSO_ISOLATO - 1 ||
    y % PASSO_ISOLATO === PASSO_ISOLATO - 1

  if (bordoIsolato) return 'marciapiede'

  // Un isolato ogni tanto è verde invece che costruito.
  const isolatoX = Math.floor(x / PASSO_ISOLATO)
  const isolatoY = Math.floor(y / PASSO_ISOLATO)
  if ((isolatoX + isolatoY * 3) % 5 === 2) return 'parco'

  // Fuori dai bordi della città non si costruisce.
  if (x >= lato - 1 || y >= lato - 1) return 'marciapiede'

  return 'edificio'
}

/** Si può camminare qui? */
export function calpestabile(mappa: Cella[][], x: number, y: number): boolean {
  const cx = Math.floor(x)
  const cy = Math.floor(y)

  if (cy < 0 || cy >= mappa.length) return false
  if (cx < 0 || cx >= mappa[cy].length) return false

  return mappa[cy][cx] !== 'edificio'
}

/**
 * Quanti piani ha l'edificio in questa cella.
 *
 * Deterministica: la stessa cella dà sempre lo stesso risultato, così la città
 * non cambia forma a ogni caricamento e non serve salvarne l'aspetto.
 */
export function pianiEdificio(x: number, y: number): number {
  const rumore = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  const frazione = rumore - Math.floor(rumore)
  return 2 + Math.floor(frazione * 4)
}

/** Una posizione libera dove far comparire il giocatore. */
export function puntoDiPartenza(mappa: Cella[][]): Griglia {
  const centro = Math.floor(mappa.length / 2)

  for (let raggio = 0; raggio < mappa.length; raggio++) {
    for (let dy = -raggio; dy <= raggio; dy++) {
      for (let dx = -raggio; dx <= raggio; dx++) {
        const x = centro + dx
        const y = centro + dy
        if (calpestabile(mappa, x, y)) return { x: x + 0.5, y: y + 0.5 }
      }
    }
  }

  return { x: 0.5, y: 0.5 }
}
