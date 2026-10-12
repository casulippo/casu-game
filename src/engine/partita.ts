import type { Ruolo } from './attributi'
import { poisson, rng, sceltaPesata } from './rng'
import { MODULI, type Evento, type Giocatore, type Modulo, type Partita } from './tipi'

export function formazione(rosa: Giocatore[], modulo: Modulo, esclusi: string[] = []): Giocatore[] {
  const disponibili = rosa.filter((g) => !esclusi.includes(g.id)).sort((a, b) => b.overall - a.overall)
  const scelti: Giocatore[] = []
  for (const [ruolo, quanti] of Object.entries(MODULI[modulo]) as [Ruolo, number][]) {
    scelti.push(...disponibili.filter((g) => g.ruolo === ruolo && !scelti.includes(g)).slice(0, quanti))
  }
  // Reparto scoperto: si riempie con i migliori rimasti, come farebbe un allenatore in emergenza.
  for (const g of disponibili) if (scelti.length < 11 && !scelti.includes(g)) scelti.push(g)
  return scelti
}

const media = (gs: Giocatore[]) => (gs.length ? gs.reduce((s, g) => s + g.overall, 0) / gs.length : 40)

export function forza(xi: Giocatore[]) {
  const per = (r: Ruolo) => xi.filter((g) => g.ruolo === r)
  const centrocampo = media(per('Midfield'))
  return {
    attacco: 0.6 * media(per('Attack')) + 0.4 * centrocampo,
    difesa: 0.55 * media(per('Defender')) + 0.25 * media(per('Goalkeeper')) + 0.2 * centrocampo,
  }
}

// Gol attesi: 1,35 in casa e 1,05 fuori tra squadre pari; ogni 10 punti di divario li moltiplica per ~1,5.
const golAttesi = (attacco: number, difesa: number, casa: boolean) =>
  (casa ? 1.35 : 1.05) * Math.exp((attacco - difesa) / 25)

const PESO_GOL: Record<Ruolo, number> = { Attack: 6, Midfield: 2.5, Defender: 0.8, Goalkeeper: 0 }
const PESO_ASSIST: Record<Ruolo, number> = { Attack: 2, Midfield: 3, Defender: 1, Goalkeeper: 0.05 }

export interface Risultato {
  golCasa: number
  golOspite: number
  eventi: Evento[]
  xiCasa: string[]
  xiOspite: string[]
}

export function giocaPartita(p: Partita, xiCasa: Giocatore[], xiOspite: Giocatore[], seme: string): Risultato {
  const r = rng(`partita:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`)
  const fc = forza(xiCasa)
  const fo = forza(xiOspite)
  const golCasa = poisson(r, golAttesi(fc.attacco, fo.difesa, true))
  const golOspite = poisson(r, golAttesi(fo.attacco, fc.difesa, false))
  const eventi: Evento[] = []
  const segna = (xi: Giocatore[], clubId: string) => {
    const marcatore = sceltaPesata(r, xi, (g) => PESO_GOL[g.ruolo] * (g.attr.finalizzazione / 10) ** 1.5)
    const compagni = xi.filter((g) => g !== marcatore)
    const assist =
      r() < 0.7 ? sceltaPesata(r, compagni, (g) => PESO_ASSIST[g.ruolo] * ((g.attr.passaggio + g.attr.visione) / 20) ** 2) : null
    eventi.push({ minuto: 1 + Math.floor(r() * 93), clubId, marcatoreId: marcatore.id, assistId: assist?.id ?? null })
  }
  for (let i = 0; i < golCasa; i++) segna(xiCasa, p.casaId)
  for (let i = 0; i < golOspite; i++) segna(xiOspite, p.ospiteId)
  eventi.sort((a, b) => a.minuto - b.minuto)
  return { golCasa, golOspite, eventi, xiCasa: xiCasa.map((g) => g.id), xiOspite: xiOspite.map((g) => g.id) }
}
