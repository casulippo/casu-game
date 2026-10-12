import { ATTRIBUTI, overall, type Attributo } from './attributi'
import { rng } from './rng'
import type { Giocatore } from './tipi'

export function eta(nascita: string | null, al: string): number | null {
  if (!nascita) return null
  const d = new Date(al)
  const n = new Date(nascita)
  const compiuti = d.getMonth() > n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() >= n.getDate())
  return d.getFullYear() - n.getFullYear() - (compiuti ? 0 : 1)
}

const FISICI: Attributo[] = ['velocita', 'resistenza', 'forza']

// Crescita media annua per età: i giovani migliorano, dopo i 30 cala soprattutto il fisico.
function tendenza(anni: number): number {
  if (anni <= 20) return 1.2
  if (anni <= 23) return 0.7
  if (anni <= 26) return 0.3
  if (anni <= 29) return 0
  if (anni <= 31) return -0.4
  if (anni <= 33) return -0.8
  return -1.3
}

export function invecchia(g: Giocatore, fineStagione: string, presenze: number, seme: string): Giocatore {
  const anni = eta(g.nascita, fineStagione) ?? 26
  const r = rng(`progressione:${seme}:${g.id}`)
  // Chi gioca cresce di più: fino a +0,5 per un titolare fisso da giovane.
  const minuti = Math.min(presenze / 30, 1)
  const attr = { ...g.attr }
  for (const a of ATTRIBUTI) {
    let delta = tendenza(anni) + (anni <= 24 ? minuti * 0.5 : 0) + (r() - 0.5) * 1.2
    if (FISICI.includes(a) && anni > 29) delta -= 0.4
    if (!FISICI.includes(a) && anni > 29) delta += 0.2
    attr[a] = Math.min(20, Math.max(1, Math.round(attr[a] + delta)))
  }
  const nuovoOverall = overall(attr, g.ruolo)
  const fattoreEta = anni <= 23 ? 1.08 : anni <= 28 ? 1 : anni <= 31 ? 0.85 : 0.65
  const valore = Math.max(50_000, Math.round((g.valore * 1.12 ** (nuovoOverall - g.overall) * fattoreEta) / 50_000) * 50_000)
  return { ...g, attr, overall: nuovoOverall, valore }
}
