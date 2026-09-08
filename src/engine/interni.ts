import type { Griglia } from './iso'

export type CellaInterno = 'pavimento' | 'muro' | 'letto' | 'tavolo' | 'uscita'

/**
 * L'interno della casa.
 *
 * Una stanza piccola e leggibile: si entra dal basso, il letto è in un angolo.
 * Quando arriverà il sistema del sonno, dormire sarà interagire con quella cella.
 */
const PIANTA = [
  '#########',
  '#LL....T#',
  '#LL....T#',
  '#.......#',
  '#.......#',
  '#.......#',
  '####U####',
]

const SIMBOLI: Record<string, CellaInterno> = {
  '#': 'muro',
  '.': 'pavimento',
  L: 'letto',
  T: 'tavolo',
  U: 'uscita',
}

export function generaInterno(): CellaInterno[][] {
  return PIANTA.map((riga) =>
    [...riga].map((simbolo) => {
      const cella = SIMBOLI[simbolo]
      if (!cella) throw new Error(`Simbolo sconosciuto nella pianta: ${simbolo}`)
      return cella
    }),
  )
}

export function calpestabileInterno(
  mappa: CellaInterno[][],
  x: number,
  y: number,
): boolean {
  const cx = Math.floor(x)
  const cy = Math.floor(y)

  if (cy < 0 || cy >= mappa.length) return false
  if (cx < 0 || cx >= mappa[cy].length) return false

  const cella = mappa[cy][cx]
  return cella !== 'muro' && cella !== 'letto' && cella !== 'tavolo'
}

/** Dove compare il giocatore entrando: appena dentro la porta. */
export function ingresso(mappa: CellaInterno[][]): Griglia {
  const uscita = cellaUscita(mappa)
  return { x: uscita.x + 0.5, y: uscita.y - 0.5 }
}

export function cellaUscita(mappa: CellaInterno[][]): Griglia {
  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (mappa[y][x] === 'uscita') return { x, y }
    }
  }
  throw new Error('La pianta non ha un uscita')
}

/** Il giocatore è sulla soglia e può uscire? */
export function sullUscita(mappa: CellaInterno[][], posizione: Griglia): boolean {
  const uscita = cellaUscita(mappa)
  const dx = uscita.x + 0.5 - posizione.x
  const dy = uscita.y + 0.5 - posizione.y
  return Math.hypot(dx, dy) <= 1.2
}
