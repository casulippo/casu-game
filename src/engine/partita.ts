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

// Un minuto di gioco: gol, tiri sbagliati e ammonizioni per entrambe le squadre.
// Per partita e squadra: gol attesi λ, circa 5λ+4 tiri sbagliati (un terzo parati), 2 ammonizioni.
function minuto(r: Rng, m: number, p: Partita, xiCasa: Giocatore[], xiOspite: Giocatore[]): Evento[] {
  const eventi: Evento[] = []
  const lato = (xi: Giocatore[], avversari: Giocatore[], clubId: string, casa: boolean) => {
    const lambda = golAttesi(forza(xi).attacco, forza(avversari).difesa, casa)
    const tiratore = () => sceltaPesata(r, xi, (g) => PESO_TIRO[g.ruolo] * (g.attr.finalizzazione / 10) ** 1.5)
    const portiere = avversari.find((g) => g.ruolo === 'Goalkeeper') ?? avversari[0]
    for (let i = poisson(r, lambda / 90); i > 0; i--) {
      const marcatore = tiratore()
      const compagni = xi.filter((g) => g !== marcatore)
      const assist =
        r() < 0.7 ? sceltaPesata(r, compagni, (g) => PESO_ASSIST[g.ruolo] * ((g.attr.passaggio + g.attr.visione) / 20) ** 2) : null
      eventi.push({ minuto: m, clubId, tipo: 'gol', marcatoreId: marcatore.id, assistId: assist?.id ?? null })
    }
    for (let i = poisson(r, (lambda * 5 + 4) / 90); i > 0; i--) {
      const x = r()
      const tipo = x < 0.33 ? 'parata' : x < 0.92 ? 'fuori' : 'palo'
      eventi.push({ minuto: m, clubId, tipo, marcatoreId: tiratore().id, assistId: null, portiereId: tipo === 'parata' ? portiere.id : undefined })
    }
    for (let i = poisson(r, 2 / 90); i > 0; i--) {
      const ammonito = sceltaPesata(r, xi, (g) => PESO_FALLO[g.ruolo] * (g.attr.contrasto / 10))
      eventi.push({ minuto: m, clubId, tipo: 'giallo', marcatoreId: ammonito.id, assistId: null })
    }
  }
  lato(xiCasa, xiOspite, p.casaId, true)
  lato(xiOspite, xiCasa, p.ospiteId, false)
  return eventi
}

// Formazione in campo a partire dal minuto `da` (incluso), dopo cambi o variazioni di modulo.
export interface Fase {
  da: number
  xi: Giocatore[]
}

export const xiAlMinuto = (base: Giocatore[], fasi: Fase[], m: number) =>
  fasi.filter((f) => f.da <= m).sort((a, b) => a.da - b.da).at(-1)?.xi ?? base

export interface Risultato {
  golCasa: number
  golOspite: number
  eventi: Evento[]
  xiCasa: string[]
  xiOspite: string[]
}

// Ogni minuto ha il suo generatore: un cambio al minuto m non altera nulla di quanto successo prima.
export function giocaPartita(
  p: Partita,
  xiCasa: Giocatore[],
  xiOspite: Giocatore[],
  seme: string,
  fasi: { casa?: Fase[]; ospite?: Fase[] } = {},
): Risultato {
  const chiave = `partita:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`
  const eventi: Evento[] = []
  for (let m = 1; m <= 90; m++) {
    const casa = xiAlMinuto(xiCasa, fasi.casa ?? [], m)
    const ospite = xiAlMinuto(xiOspite, fasi.ospite ?? [], m)
    eventi.push(...minuto(rng(`${chiave}:${m}`), m, p, casa, ospite))
  }
  const gol = (clubId: string) => eventi.filter((e) => e.tipo === 'gol' && e.clubId === clubId).length
  const ids = (base: Giocatore[], f: Fase[] = []) => [...new Set([base, ...f.map((x) => x.xi)].flat().map((g) => g.id))]
  return {
    golCasa: gol(p.casaId),
    golOspite: gol(p.ospiteId),
    eventi,
    xiCasa: ids(xiCasa, fasi.casa),
    xiOspite: ids(xiOspite, fasi.ospite),
  }
}
