/**
 * Il joystick virtuale per il touch.
 *
 * Solo matematica: quanto e in che direzione è spinta la levetta. Dove venga
 * disegnata e come reagisca al dito è affare della UI.
 */

/** Raggio della corsa della levetta, in pixel. */
export const RAGGIO_LEVETTA = 52

/**
 * Frazione del raggio entro cui l'input viene ignorato.
 *
 * Senza, il personaggio partirebbe da solo: un dito appoggiato non è mai
 * perfettamente fermo al centro.
 */
export const ZONA_MORTA = 0.18

export interface Punto {
  x: number
  y: number
}

export interface SpintaJoystick {
  /** Direzione, versore nello spazio dello schermo. */
  x: number
  y: number
  /** Quanto è spinta la levetta, da 0 a 1. Permette di camminare piano. */
  intensita: number
}

export const FERMO: SpintaJoystick = { x: 0, y: 0, intensita: 0 }

/**
 * Calcola la spinta a partire da dove è il dito rispetto al centro della levetta.
 *
 * Oltre il raggio la levetta non esce: continuare a trascinare cambia la
 * direzione ma non la velocità.
 */
export function spinta(
  centro: Punto,
  dito: Punto,
  raggio = RAGGIO_LEVETTA,
  zonaMorta = ZONA_MORTA,
): SpintaJoystick {
  const dx = dito.x - centro.x
  const dy = dito.y - centro.y
  const distanza = Math.hypot(dx, dy)

  if (distanza < raggio * zonaMorta) return FERMO

  const intensita = Math.min(distanza / raggio, 1)

  return {
    x: dx / distanza,
    y: dy / distanza,
    intensita,
  }
}

/**
 * Dove disegnare la levetta, dato il centro e la posizione del dito.
 * Resta agganciata al bordo quando il dito va oltre la corsa.
 */
export function posizioneLevetta(
  centro: Punto,
  dito: Punto,
  raggio = RAGGIO_LEVETTA,
): Punto {
  const dx = dito.x - centro.x
  const dy = dito.y - centro.y
  const distanza = Math.hypot(dx, dy)

  if (distanza <= raggio) return { x: dx, y: dy }

  return { x: (dx / distanza) * raggio, y: (dy / distanza) * raggio }
}
