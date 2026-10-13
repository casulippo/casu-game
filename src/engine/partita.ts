import type { Ruolo } from './attributi'
import { simulaPartita, type Fase, type Simulazione } from './simulazione'
import { MODULI, type Giocatore, type Modulo, type Partita } from './tipi'

export { xiAlMinuto, type Fase } from './simulazione'

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

// Indicatore sintetico per l'anteprima della partita: la simulazione usa i singoli attributi.
export function forza(xi: Giocatore[]) {
  const per = (r: Ruolo) => xi.filter((g) => g.ruolo === r)
  const centrocampo = media(per('Midfield'))
  return {
    attacco: 0.6 * media(per('Attack')) + 0.4 * centrocampo,
    difesa: 0.55 * media(per('Defender')) + 0.25 * media(per('Goalkeeper')) + 0.2 * centrocampo,
  }
}

export interface Risultato extends Simulazione {
  golCasa: number
  golOspite: number
  xiCasa: string[]
  xiOspite: string[]
}

export function giocaPartita(
  p: Partita,
  xiCasa: Giocatore[],
  xiOspite: Giocatore[],
  seme: string,
  fasi: { casa?: Fase[]; ospite?: Fase[] } = {},
): Risultato {
  const sim = simulaPartita(p, xiCasa, xiOspite, seme, fasi)
  const gol = (clubId: string) => sim.eventi.filter((e) => e.tipo === 'gol' && e.clubId === clubId).length
  const ids = (base: Giocatore[], f: Fase[] = []) => [...new Set([base, ...f.map((x) => x.xi)].flat().map((g) => g.id))]
  return {
    ...sim,
    golCasa: gol(p.casaId),
    golOspite: gol(p.ospiteId),
    xiCasa: ids(xiCasa, fasi.casa),
    xiOspite: ids(xiOspite, fasi.ospite),
  }
}
