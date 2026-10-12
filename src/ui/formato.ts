import type { Ruolo } from '../engine/attributi'

export const RUOLO_BREVE: Record<Ruolo, string> = { Goalkeeper: 'POR', Defender: 'DIF', Midfield: 'CEN', Attack: 'ATT' }
export const RUOLO_ESTESO: Record<Ruolo, string> = {
  Goalkeeper: 'Portiere',
  Defender: 'Difensore',
  Midfield: 'Centrocampista',
  Attack: 'Attaccante',
}

export function euro(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—'
  if (v >= 1e6) return `€${(v / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 })} mln`
  if (v >= 1e3) return `€${Math.round(v / 1e3)} mila`
  return `€${v}`
}

export const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function coloreOverall(o: number): string {
  if (o >= 85) return 'bg-emerald-400 text-emerald-950'
  if (o >= 78) return 'bg-lime-400 text-lime-950'
  if (o >= 70) return 'bg-amber-300 text-amber-950'
  if (o >= 62) return 'bg-orange-400 text-orange-950'
  return 'bg-rose-400 text-rose-950'
}

export function coloreAttributo(v: number): string {
  if (v >= 16) return 'text-emerald-300'
  if (v >= 13) return 'text-lime-300'
  if (v >= 10) return 'text-amber-200'
  if (v >= 7) return 'text-orange-300'
  return 'text-rose-300'
}
