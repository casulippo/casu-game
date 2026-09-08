import type { Tempo } from './state'

/**
 * L'illuminazione della città, derivata dall'ora di gioco.
 *
 * Non sono quattro fasi a scatti ma una curva continua: i colori vengono
 * interpolati tra momenti chiave della giornata, così l'alba e il tramonto si
 * vedono scorrere invece di comparire di colpo.
 */
export interface Illuminazione {
  /** Colore del cielo, sullo sfondo. */
  cielo: number
  /**
   * Tinta moltiplicata sul mondo.
   * Bianco significa luce piena e nessuna alterazione.
   */
  tinta: number
  /** Quanto sono accese le luci artificiali: 0 spente, 1 al massimo. */
  luci: number
}

interface Momento extends Illuminazione {
  ora: number
}

/** I momenti chiave della giornata. In mezzo si interpola. */
const MOMENTI: Momento[] = [
  { ora: 0, cielo: 0x070a12, tinta: 0x2f3a58, luci: 1 },
  { ora: 5, cielo: 0x16203a, tinta: 0x4a5474, luci: 0.95 },
  { ora: 6.5, cielo: 0x4a6b8a, tinta: 0x9c95a8, luci: 0.5 },
  { ora: 8, cielo: 0x7fb3d5, tinta: 0xe8e2e0, luci: 0.1 },
  { ora: 12, cielo: 0x8fc4e8, tinta: 0xffffff, luci: 0 },
  { ora: 16, cielo: 0x9ec4e0, tinta: 0xfff4e4, luci: 0 },
  { ora: 18.5, cielo: 0xd98b5f, tinta: 0xffc08a, luci: 0.25 },
  { ora: 20, cielo: 0x6b4a63, tinta: 0x9a7f96, luci: 0.7 },
  { ora: 21.5, cielo: 0x2a2340, tinta: 0x5a5478, luci: 0.95 },
  { ora: 24, cielo: 0x070a12, tinta: 0x2f3a58, luci: 1 },
]

export function illuminazione(tempo: Tempo): Illuminazione {
  const ora = tempo.ora + tempo.minuto / 60

  for (let i = 0; i < MOMENTI.length - 1; i++) {
    const da = MOMENTI[i]
    const a = MOMENTI[i + 1]
    if (ora < da.ora || ora > a.ora) continue

    const t = a.ora === da.ora ? 0 : (ora - da.ora) / (a.ora - da.ora)
    return {
      cielo: mescolaColore(da.cielo, a.cielo, t),
      tinta: mescolaColore(da.tinta, a.tinta, t),
      luci: da.luci + (a.luci - da.luci) * t,
    }
  }

  return MOMENTI[0]
}

/** Interpolazione lineare tra due colori, canale per canale. */
export function mescolaColore(da: number, a: number, t: number): number {
  const k = Math.min(Math.max(t, 0), 1)

  const r = canale(da, 16) + (canale(a, 16) - canale(da, 16)) * k
  const g = canale(da, 8) + (canale(a, 8) - canale(da, 8)) * k
  const b = canale(da, 0) + (canale(a, 0) - canale(da, 0)) * k

  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)
}

function canale(colore: number, spostamento: number): number {
  return (colore >> spostamento) & 0xff
}

/** Le luci artificiali sono accese abbastanza da vedersi? */
export function luciAccese(illum: Illuminazione): boolean {
  return illum.luci > 0.05
}
