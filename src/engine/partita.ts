import type { Ruolo } from './attributi'
import { poisson, rng, sceltaPesata, type Rng } from './rng'
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

const PESO_TIRO: Record<Ruolo, number> = { Attack: 6, Midfield: 2.5, Defender: 0.8, Goalkeeper: 0 }
const PESO_ASSIST: Record<Ruolo, number> = { Attack: 2, Midfield: 3, Defender: 1, Goalkeeper: 0.05 }
const PESO_FALLO: Record<Ruolo, number> = { Attack: 1, Midfield: 3, Defender: 3, Goalkeeper: 0.2 }

export function possesso(xiCasa: Giocatore[], xiOspite: Giocatore[]): number {
  const cc = media(xiCasa.filter((g) => g.ruolo === 'Midfield'))
  const co = media(xiOspite.filter((g) => g.ruolo === 'Midfield'))
  return Math.round(Math.min(68, Math.max(32, 51 + (cc - co) * 1.2)))
}

// Un tempo di gioco: gol, tiri sbagliati e ammonizioni per entrambe le squadre.
function tempo(r: Rng, p: Partita, xiCasa: Giocatore[], xiOspite: Giocatore[], inizio: 0 | 45): Evento[] {
  const eventi: Evento[] = []
  const minuto = () => inizio + 1 + Math.floor(r() * 45)
  const lato = (xi: Giocatore[], avversari: Giocatore[], clubId: string, casa: boolean) => {
    const att = forza(xi)
    const dif = forza(avversari)
    const lambda = golAttesi(att.attacco, dif.difesa, casa) / 2
    const tiratore = () => sceltaPesata(r, xi, (g) => PESO_TIRO[g.ruolo] * (g.attr.finalizzazione / 10) ** 1.5)
    const portiere = avversari.find((g) => g.ruolo === 'Goalkeeper') ?? avversari[0]
    for (let i = poisson(r, lambda); i > 0; i--) {
      const marcatore = tiratore()
      const compagni = xi.filter((g) => g !== marcatore)
      const assist =
        r() < 0.7 ? sceltaPesata(r, compagni, (g) => PESO_ASSIST[g.ruolo] * ((g.attr.passaggio + g.attr.visione) / 20) ** 2) : null
      eventi.push({ minuto: minuto(), clubId, tipo: 'gol', marcatoreId: marcatore.id, assistId: assist?.id ?? null })
    }
    // Circa 11 tiri a partita per squadra, un terzo nello specchio: quelli non finiti in rete.
    for (let i = poisson(r, lambda * 5 + 2); i > 0; i--) {
      const x = r()
      const tipo = x < 0.33 ? 'parata' : x < 0.92 ? 'fuori' : 'palo'
      eventi.push({ minuto: minuto(), clubId, tipo, marcatoreId: tiratore().id, assistId: null, portiereId: tipo === 'parata' ? portiere.id : undefined })
    }
    for (let i = poisson(r, 1); i > 0; i--) {
      const ammonito = sceltaPesata(r, xi, (g) => PESO_FALLO[g.ruolo] * (g.attr.contrasto / 10))
      eventi.push({ minuto: minuto(), clubId, tipo: 'giallo', marcatoreId: ammonito.id, assistId: null })
    }
  }
  lato(xiCasa, xiOspite, p.casaId, true)
  lato(xiOspite, xiCasa, p.ospiteId, false)
  return eventi
}

export interface Risultato {
  golCasa: number
  golOspite: number
  eventi: Evento[]
  xiCasa: string[]
  xiOspite: string[]
}

// Ogni tempo ha il suo generatore: cambiare formazione all'intervallo non altera il primo tempo già visto.
export function giocaPartita(
  p: Partita,
  xiCasa: Giocatore[],
  xiOspite: Giocatore[],
  seme: string,
  secondoTempo: { casa?: Giocatore[]; ospite?: Giocatore[] } = {},
): Risultato {
  const chiave = `partita:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`
  const xi2Casa = secondoTempo.casa ?? xiCasa
  const xi2Ospite = secondoTempo.ospite ?? xiOspite
  const eventi = [
    ...tempo(rng(`${chiave}:1`), p, xiCasa, xiOspite, 0),
    ...tempo(rng(`${chiave}:2`), p, xi2Casa, xi2Ospite, 45),
  ].sort((a, b) => a.minuto - b.minuto)
  const gol = (clubId: string) => eventi.filter((e) => e.tipo === 'gol' && e.clubId === clubId).length
  const ids = (a: Giocatore[], b: Giocatore[]) => [...new Set([...a, ...b].map((g) => g.id))]
  return {
    golCasa: gol(p.casaId),
    golOspite: gol(p.ospiteId),
    eventi,
    xiCasa: ids(xiCasa, xi2Casa),
    xiOspite: ids(xiOspite, xi2Ospite),
  }
}
