export type Rng = () => number

// Generatore deterministico: stessa chiave, stessa sequenza. Rende le partite riproducibili.
export function rng(chiave: string): Rng {
  let h = 2166136261
  for (const ch of chiave) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function poisson(r: Rng, lambda: number): number {
  const limite = Math.exp(-lambda)
  let k = 0
  let p = r()
  while (p > limite) {
    k++
    p *= r()
  }
  return k
}

export function sceltaPesata<T>(r: Rng, elementi: T[], peso: (e: T) => number): T {
  const pesi = elementi.map(peso)
  let x = r() * pesi.reduce((a, b) => a + b, 0)
  for (let i = 0; i < elementi.length; i++) {
    x -= pesi[i]
    if (x <= 0) return elementi[i]
  }
  return elementi[elementi.length - 1]
}
