/**
 * Proiezione isometrica 2:1.
 *
 * Il gioco ragiona su una griglia cartesiana: la logica (NPC, routine, edifici)
 * conosce solo celle `x, y`. La proiezione in coordinate schermo avviene solo al
 * momento di disegnare. Nessun sistema di gioco deve sapere che la vista è obliqua.
 */

/** Larghezza di un tile a schermo, in pixel. */
export const TILE_W = 64
/** Altezza di un tile a schermo. Metà della larghezza: è ciò che rende la vista 2:1. */
export const TILE_H = 32
/** Quanti pixel di altezza vale un piano di un edificio. */
export const ALTEZZA_PIANO = 22

export interface Griglia {
  x: number
  y: number
}

export interface Schermo {
  sx: number
  sy: number
}

/** Dalla griglia di gioco alle coordinate schermo. */
export function grigliaASchermo({ x, y }: Griglia): Schermo {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2),
  }
}

/** Dalle coordinate schermo alla griglia. Serve per i click del mouse. */
export function schermoAGriglia({ sx, sy }: Schermo): Griglia {
  const a = sx / (TILE_W / 2)
  const b = sy / (TILE_H / 2)
  return {
    x: (b + a) / 2,
    y: (b - a) / 2,
  }
}

/**
 * Ordine di disegno.
 *
 * In isometrica chi sta "più avanti" va disegnato sopra, altrimenti un personaggio
 * dietro un palazzo gli comparirebbe davanti. La somma delle coordinate cresce
 * andando verso il basso dello schermo, quindi è già l'ordine giusto.
 */
export function profondita({ x, y }: Griglia): number {
  return x + y
}

/**
 * Converte una direzione premuta sulla tastiera in uno spostamento sulla griglia.
 *
 * Il giocatore ragiona rispetto allo schermo: "su" deve andare verso l'alto dello
 * schermo, non verso il nord della griglia. In isometrica le due cose differiscono,
 * e questa funzione è la traduzione.
 */
export function direzioneSchermoAGriglia(
  su: boolean,
  giu: boolean,
  sinistra: boolean,
  destra: boolean,
): Griglia {
  const vx = (destra ? 1 : 0) - (sinistra ? 1 : 0)
  const vy = (giu ? 1 : 0) - (su ? 1 : 0)
  return direzioneDaVettoreSchermo(vx, vy)
}

/**
 * Come sopra, ma per input analogici: un joystick touch spinto a metà, o il
 * trascinamento del mouse.
 *
 * La proiezione è lineare, quindi la stessa trasformazione che converte i punti
 * converte anche le direzioni.
 */
export function direzioneDaVettoreSchermo(vsx: number, vsy: number): Griglia {
  const { x, y } = schermoAGriglia({ sx: vsx, sy: vsy })

  // Normalizza, altrimenti muoversi in diagonale sarebbe più veloce.
  const modulo = Math.hypot(x, y)
  if (modulo === 0) return { x: 0, y: 0 }

  return { x: x / modulo, y: y / modulo }
}

/** I quattro vertici del rombo di una cella, in coordinate schermo. */
export function verticiCella(cella: Griglia): number[] {
  const { sx, sy } = grigliaASchermo(cella)
  const mw = TILE_W / 2
  const mh = TILE_H / 2

  // Partendo dal vertice superiore, in senso orario.
  return [sx, sy - mh, sx + mw, sy, sx, sy + mh, sx - mw, sy]
}
