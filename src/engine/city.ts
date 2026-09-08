import type { Griglia } from './iso'
import { LUOGHI, celleOccupate, type Luogo } from './luoghi'

export type Cella = 'strada' | 'marciapiede' | 'erba' | 'albero' | 'edificio'

export const LATO_CITTA = 22

/** La carreggiata: due celle di strada che attraversano la città. */
const STRADA_Y = [10, 11]
/** I marciapiedi ai lati della carreggiata. */
const MARCIAPIEDE_Y = [9, 12]

/** Alberi disposti a mano lungo i bordi, per non lasciare il verde vuoto. */
const ALBERI: Griglia[] = [
  { x: 2, y: 2 },
  { x: 2, y: 15 },
  { x: 3, y: 18 },
  { x: 7, y: 17 },
  { x: 11, y: 3 },
  { x: 12, y: 6 },
  { x: 17, y: 4 },
  { x: 18, y: 8 },
  { x: 19, y: 16 },
  { x: 8, y: 19 },
]

/**
 * Costruisce la mappa della città.
 *
 * Prima il terreno, poi gli edifici sopra: così un luogo aggiunto in `luoghi.ts`
 * compare senza dover toccare questa funzione.
 */
export function generaCitta(
  lato = LATO_CITTA,
  luoghi: Luogo[] = LUOGHI,
): Cella[][] {
  const mappa: Cella[][] = []

  for (let y = 0; y < lato; y++) {
    const riga: Cella[] = []
    for (let x = 0; x < lato; x++) {
      riga.push(terrenoIn(x, y))
    }
    mappa.push(riga)
  }

  for (const albero of ALBERI) {
    if (dentro(mappa, albero.x, albero.y)) {
      mappa[albero.y][albero.x] = 'albero'
    }
  }

  for (const luogo of luoghi) {
    for (const cella of celleOccupate(luogo)) {
      if (dentro(mappa, cella.x, cella.y)) {
        mappa[cella.y][cella.x] = 'edificio'
      }
    }
    // La porta resta sempre praticabile, altrimenti il luogo è irraggiungibile.
    if (dentro(mappa, luogo.porta.x, luogo.porta.y)) {
      mappa[luogo.porta.y][luogo.porta.x] = 'marciapiede'
    }
  }

  return mappa
}

function terrenoIn(x: number, y: number): Cella {
  if (STRADA_Y.includes(y)) return 'strada'
  if (MARCIAPIEDE_Y.includes(y)) return 'marciapiede'

  // Un marciapiede verticale che collega la strada ai due edifici.
  if (x === 6 && y < 10) return 'marciapiede'
  if (x === 14 && y > 11) return 'marciapiede'

  return 'erba'
}

function dentro(mappa: Cella[][], x: number, y: number): boolean {
  return y >= 0 && y < mappa.length && x >= 0 && x < mappa[y].length
}

/** Si può camminare qui? */
export function calpestabile(mappa: Cella[][], x: number, y: number): boolean {
  const cx = Math.floor(x)
  const cy = Math.floor(y)

  if (!dentro(mappa, cx, cy)) return false

  const cella = mappa[cy][cx]
  return cella !== 'edificio' && cella !== 'albero'
}

/** Il giocatore comincia sul marciapiede, davanti a casa. */
export function puntoDiPartenza(mappa: Cella[][]): Griglia {
  const davantiACasa = { x: 14.5, y: 12.5 }
  if (calpestabile(mappa, davantiACasa.x, davantiACasa.y)) return davantiACasa

  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (calpestabile(mappa, x, y)) return { x: x + 0.5, y: y + 0.5 }
    }
  }

  return { x: 0.5, y: 0.5 }
}
