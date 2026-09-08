/**
 * Proiezione dall'alto.
 *
 * Il gioco ragiona su una griglia cartesiana: la logica (NPC, routine, edifici)
 * conosce solo celle `x, y`. La proiezione in coordinate schermo avviene solo al
 * momento di disegnare, ed è tutta qui dentro: nessun sistema di gioco sa come
 * è inquadrato il mondo.
 *
 * La vista è a griglia quadrata guardata dall'alto, ma non a piombo: degli
 * edifici si vede ancora la facciata, come nei giochi d'avventura in due
 * dimensioni. È il compromesso che dà profondità senza rinunciare alla
 * leggibilità della pianta.
 */

/** Larghezza di un tile a schermo, in pixel. */
export const TILE_W = 48
/** Altezza di un tile a schermo. Uguale alla larghezza: la griglia è quadrata. */
export const TILE_H = 48
/** Quanti pixel di altezza vale un piano di un edificio. */
export const ALTEZZA_PIANO = 26

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
  return { sx: x * TILE_W, sy: y * TILE_H }
}

/** Dalle coordinate schermo alla griglia. Serve per i click del mouse. */
export function schermoAGriglia({ sx, sy }: Schermo): Griglia {
  return { x: sx / TILE_W, y: sy / TILE_H }
}

/**
 * Ordine di disegno.
 *
 * Chi sta più in basso sullo schermo è più vicino a chi guarda, quindi va
 * disegnato sopra: altrimenti un personaggio davanti a una casa le finirebbe
 * dietro.
 */
export function profondita({ y }: Griglia): number {
  return y
}

/**
 * Converte una direzione premuta sulla tastiera in uno spostamento sulla
 * griglia.
 *
 * Con la vista dall'alto gli assi coincidono con quelli dello schermo, quindi
 * la conversione è diretta.
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
 */
export function direzioneDaVettoreSchermo(vsx: number, vsy: number): Griglia {
  const { x, y } = schermoAGriglia({ sx: vsx, sy: vsy })

  // Normalizza, altrimenti muoversi in diagonale sarebbe più veloce.
  const modulo = Math.hypot(x, y)
  if (modulo === 0) return { x: 0, y: 0 }

  return { x: x / modulo, y: y / modulo }
}

/** I quattro vertici della cella, in coordinate schermo. */
export function verticiCella(cella: Griglia): number[] {
  const { sx, sy } = grigliaASchermo(cella)
  const mw = TILE_W / 2
  const mh = TILE_H / 2

  // Partendo dall'angolo in alto a sinistra, in senso orario.
  return [sx - mw, sy - mh, sx + mw, sy - mh, sx + mw, sy + mh, sx - mw, sy + mh]
}
