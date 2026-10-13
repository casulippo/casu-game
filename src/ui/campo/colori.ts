export interface Divisa {
  maglia: string
  dettaglio: string
}

interface Divise {
  casa: Divisa
  trasferta: Divisa
}

// Chiave: id Transfermarkt del club.
const DIVISE: Record<string, Divise> = {
  '800': { casa: { maglia: '#1e5aa8', dettaglio: '#111111' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#1e5aa8' } },
  '1025': { casa: { maglia: '#a21d2b', dettaglio: '#1a2a5a' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#a21d2b' } },
  '1390': { casa: { maglia: '#a6192e', dettaglio: '#002b5c' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#a6192e' } },
  '1047': { casa: { maglia: '#0b3d91', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#0b3d91' } },
  '430': { casa: { maglia: '#5b2a86', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#5b2a86' } },
  '8970': { casa: { maglia: '#f7d117', dettaglio: '#0047ab' }, trasferta: { maglia: '#0047ab', dettaglio: '#f7d117' } },
  '252': { casa: { maglia: '#b5162b', dettaglio: '#0a2a5e' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#0a2a5e' } },
  '46': { casa: { maglia: '#0068a8', dettaglio: '#111111' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#0068a8' } },
  '506': { casa: { maglia: '#f5f5f5', dettaglio: '#111111' }, trasferta: { maglia: '#1d1d1d', dettaglio: '#f0c419' } },
  '398': { casa: { maglia: '#87ceeb', dettaglio: '#ffffff' }, trasferta: { maglia: '#1a2a4a', dettaglio: '#87ceeb' } },
  '1005': { casa: { maglia: '#ffd200', dettaglio: '#c8102e' }, trasferta: { maglia: '#1a2a4a', dettaglio: '#ffd200' } },
  '5': { casa: { maglia: '#d0021b', dettaglio: '#111111' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#d0021b' } },
  '2919': { casa: { maglia: '#c8102e', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#c8102e' } },
  '6195': { casa: { maglia: '#12a0d7', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#12a0d7' } },
  '130': { casa: { maglia: '#f5f5f5', dettaglio: '#1b3f8b' }, trasferta: { maglia: '#1b3f8b', dettaglio: '#f7d117' } },
  '12': { casa: { maglia: '#8e1f2f', dettaglio: '#f0bc42' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#8e1f2f' } },
  '6574': { casa: { maglia: '#00a650', dettaglio: '#111111' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#00a650' } },
  '416': { casa: { maglia: '#8b1e2d', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#8b1e2d' } },
  '410': { casa: { maglia: '#f5f5f5', dettaglio: '#111111' }, trasferta: { maglia: '#1d1d1d', dettaglio: '#f5f5f5' } },
  '607': { casa: { maglia: '#1d1d1d', dettaglio: '#f47920' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#0f7a3a' } },
}

const NEUTRA: Divise = { casa: { maglia: '#2563eb', dettaglio: '#ffffff' }, trasferta: { maglia: '#f2f2f2', dettaglio: '#111111' } }

export const PORTIERE_CASA: Divisa = { maglia: '#c6f432', dettaglio: '#1d1d1d' }
export const PORTIERE_OSPITE: Divisa = { maglia: '#ff8c00', dettaglio: '#1d1d1d' }

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function simili(a: string, b: string): boolean {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) < 120
}

// La squadra ospite indossa la seconda maglia se la prima si confonde con quella di casa.
export function divise(casaId: string, ospiteId: string): { casa: Divisa; ospite: Divisa } {
  const casa = (DIVISE[casaId] ?? NEUTRA).casa
  const ospite = DIVISE[ospiteId] ?? NEUTRA
  return { casa, ospite: simili(casa.maglia, ospite.casa.maglia) ? ospite.trasferta : ospite.casa }
}
