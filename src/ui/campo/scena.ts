import type { Ruolo } from '../../engine/attributi'
import { rng, type Rng } from '../../engine/rng'
import { tipoEvento, type Evento, type Giocatore, type Partita, type TipoEvento } from '../../engine/tipi'

// Campo in metri: x da 0 a 105 (la squadra di casa attacca verso destra), y da 0 a 68.
export const LUNGHEZZA = 105
export const LARGHEZZA = 68
const CENTRO = { x: LUNGHEZZA / 2, y: LARGHEZZA / 2 }
const PALO_ALTO = 30.34
const PALO_BASSO = 37.66

export interface Posto {
  id: string
  nome: string
  ruolo: Ruolo
  numero: number
  casa: boolean
  base: { x: number; y: number }
}

// La palla resta ferma in (x, y) da `arrivo` a `partenza`, poi viaggia verso la tappa successiva.
interface Tappa {
  arrivo: number
  partenza: number
  x: number
  y: number
  id?: string
  // Altezza massima del volo che porta la palla qui (metri).
  alta: number
}

export type TipoSegmento = 'gioco' | 'azione' | 'dopo'

interface Segmento {
  inizio: number
  fine: number
  tipo: TipoSegmento
  casa: boolean
  evento?: Evento
}

export interface Scena {
  posti: [Posto[], Posto[]]
  segmenti: Segmento[]
  tappe: Tappa[]
  gialli: { minuto: number; id: string }[]
}

export interface StatoGiocatore extends Posto {
  x: number
  y: number
  conPalla: boolean
  giallo: boolean
}

export interface Stato {
  giocatori: StatoGiocatore[]
  palla: { x: number; y: number; h: number }
  portatore: string | null
  evidenza: { tipo: TipoEvento; protagonista: string; casa: boolean } | null
  saliente: boolean
}

const RIGA: Record<Ruolo, number> = { Goalkeeper: 4, Defender: 20, Midfield: 37, Attack: 51 }
const ORDINE_RUOLI: Ruolo[] = ['Goalkeeper', 'Defender', 'Midfield', 'Attack']

const lato = (g: Giocatore) => (/Left/i.test(g.sottoruolo ?? '') ? 0 : /Right/i.test(g.sottoruolo ?? '') ? 2 : 1)

export function disponi(xi: Giocatore[], casa: boolean): Posto[] {
  const posti: Posto[] = []
  let numero = 1
  for (const ruolo of ORDINE_RUOLI) {
    const riga = xi.filter((g) => g.ruolo === ruolo).sort((a, b) => lato(a) - lato(b) || b.overall - a.overall)
    riga.forEach((g, i) => {
      const x = RIGA[ruolo]
      const y = (LARGHEZZA * (i + 1)) / (riga.length + 1)
      posti.push({
        id: g.id,
        nome: g.nome,
        ruolo,
        numero: numero++,
        casa,
        base: casa ? { x, y } : { x: LUNGHEZZA - x, y: LARGHEZZA - y },
      })
    })
  }
  return posti
}

const verso = (casa: boolean) => (casa ? 1 : -1)
const portaAvversaria = (casa: boolean) => (casa ? LUNGHEZZA : 0)
const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export interface FormazioniPartita {
  casa: [Giocatore[], Giocatore[]]
  ospite: [Giocatore[], Giocatore[]]
}

export function creaScena(p: Partita, xi: FormazioniPartita, possessoCasa: number, seme: string): Scena {
  const r = rng(`scena:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`)
  const posti: [Posto[], Posto[]] = [
    [...disponi(xi.casa[0], true), ...disponi(xi.ospite[0], false)],
    [...disponi(xi.casa[1], true), ...disponi(xi.ospite[1], false)],
  ]
  const tappe: Tappa[] = [{ arrivo: 0, partenza: 0, x: CENTRO.x, y: CENTRO.y, alta: 0 }]
  const segmenti: Segmento[] = []
  const eventi = [...(p.eventi ?? [])].sort((a, b) => a.minuto - b.minuto)
  const gialli = eventi.filter((e) => tipoEvento(e) === 'giallo').map((e) => ({ minuto: e.minuto, id: e.marcatoreId }))

  const ultima = () => tappe[tappe.length - 1]
  // Lascia la palla dov'è fino a `da`, poi la manda in (x, y) entro `arrivo`.
  // Velocità massima in metri per minuto di gioco: nelle azioni salienti un minuto dura ~7 secondi.
  const passa = (da: number, arrivo: number, x: number, y: number, id?: string, alta = 0, velocitaMax = 400) => {
    const prec = ultima()
    prec.partenza = Math.max(prec.arrivo, da)
    x = limita(x, -2, LUNGHEZZA + 2)
    y = limita(y, -2, LARGHEZZA + 2)
    arrivo = Math.max(arrivo, prec.partenza + Math.max(0.01, Math.hypot(x - prec.x, y - prec.y) / velocitaMax))
    tappe.push({ arrivo, partenza: arrivo, x, y, id, alta })
  }
  const postiDi = (t: number, casa: boolean) => posti[t < 45 ? 0 : 1].filter((q) => q.casa === casa)
  const avanzato = (q: Posto, quanto: number) => ({ x: q.base.x + verso(q.casa) * quanto, y: q.base.y })
  const scegli = <T,>(rr: Rng, a: T[]) => a[Math.floor(rr() * a.length)]
  const altezzaPassaggio = (x: number, y: number) => (Math.hypot(x - ultima().x, y - ultima().y) > 28 ? 2.5 : 0)

  const gioco = (a: number, b: number) => {
    let t = a
    while (t < b - 0.05) {
      const durata = Math.min(b - t, 0.8 + r() * 2.2)
      const casa = r() * 100 < possessoCasa
      const squadra = postiDi(t, casa).filter((q) => q.ruolo !== 'Goalkeeper')
      const passaggi = Math.max(1, Math.round(durata / 0.55))
      const passo = durata / passaggi
      // Il primo a toccare palla è il più vicino: sembra un recupero o una ripartenza.
      let corrente = [...squadra].sort(
        (q1, q2) => Math.hypot(q1.base.x - ultima().x, q1.base.y - ultima().y) - Math.hypot(q2.base.x - ultima().x, q2.base.y - ultima().y),
      )[0]
      for (let i = 0; i < passaggi; i++) {
        const inizio = t + i * passo
        if (i > 0) {
          const candidati = squadra.filter((q) => q !== corrente && (q.ruolo !== 'Attack' || r() < 0.25))
          corrente = scegli(r, candidati.length ? candidati : squadra)
        }
        const pos = avanzato(corrente, 6)
        const x = pos.x + (r() - 0.5) * 8
        const y = pos.y + (r() - 0.5) * 8
        passa(inizio, inizio + passo * 0.3, x, y, corrente.id, altezzaPassaggio(x, y))
      }
      segmenti.push({ inizio: t, fine: t + durata, tipo: 'gioco', casa })
      t += durata
    }
  }

  const azione = (e: Evento, inizio: number, tiro: number, fine: number) => {
    const casa = e.clubId === p.casaId
    const dir = verso(casa)
    const porta = portaAvversaria(casa)
    const squadra = postiDi(inizio, casa)
    const portiere = postiDi(inizio, !casa).find((q) => q.ruolo === 'Goalkeeper')
    const trova = (id: string | null | undefined) => squadra.find((q) => q.id === id)
    const tiratore = trova(e.marcatoreId) ?? scegli(r, squadra.filter((q) => q.ruolo === 'Attack'))
    const di = (ruoli: Ruolo[]) => squadra.filter((q) => ruoli.includes(q.ruolo) && q !== tiratore)
    const rifinitore = trova(e.assistId) ?? scegli(r, di(['Midfield', 'Attack']))
    const lunga = tiro - inizio > 0.6
    const catena = [...(lunga ? [scegli(r, di(['Defender', 'Midfield'])), scegli(r, di(['Midfield']))] : []), rifinitore, tiratore].filter(
      (q, i, a) => q && q !== a[i - 1],
    )
    const sullaFascia = r() < 0.5
    const posizioni = catena.map((q, i) => {
      if (q === tiratore) return { x: porta - dir * (11 + r() * 8), y: CENTRO.y + (r() - 0.5) * 16 }
      if (q === rifinitore) return { x: porta - dir * (20 + r() * 10), y: sullaFascia ? (r() < 0.5 ? 9 : 59) : CENTRO.y + (r() - 0.5) * 20 }
      const avanti = avanzato(q, 8 + i * 6)
      return { x: avanti.x, y: avanti.y + (r() - 0.5) * 10 }
    })
    const durataTiro = 0.07
    const passo = (tiro - durataTiro - inizio) / catena.length
    catena.forEach((q, i) => {
      const da = inizio + i * passo
      passa(da, da + passo * 0.35, posizioni[i].x, posizioni[i].y, q.id, altezzaPassaggio(posizioni[i].x, posizioni[i].y))
    })
    const tipo = tipoEvento(e)
    const partenzaTiro = tiro - durataTiro
    const TIRO = 1100
    if (tipo === 'gol') {
      passa(partenzaTiro, tiro, porta + dir * 1, PALO_ALTO + 1 + r() * 5.3, undefined, 0.5 + r() * 1.5, TIRO)
      // Dopo l'esultanza la palla torna a centrocampo per il calcio d'inizio.
      passa(fine - 0.12, fine, CENTRO.x, CENTRO.y)
    } else if (tipo === 'parata') {
      passa(partenzaTiro, tiro, porta - dir * 1.2, CENTRO.y + (r() - 0.5) * 4, portiere?.id, 0.6, TIRO)
    } else if (tipo === 'palo') {
      const y = r() < 0.5 ? PALO_ALTO : PALO_BASSO
      passa(partenzaTiro, tiro, porta, y, undefined, 0.8, TIRO)
      passa(tiro, tiro + 0.06, porta - dir * 9, y + (y < CENTRO.y ? -6 : 6), undefined, 1)
    } else {
      const sopra = r() < 0.4
      const y = sopra ? CENTRO.y + (r() - 0.5) * 6 : r() < 0.5 ? PALO_ALTO - 1 - r() * 4 : PALO_BASSO + 1 + r() * 4
      passa(partenzaTiro, tiro, porta + dir * 2, y, undefined, sopra ? 3.5 : 0.8, TIRO)
    }
    segmenti.push({ inizio, fine: tiro, tipo: 'azione', casa, evento: e })
    segmenti.push({ inizio: tiro, fine, tipo: 'dopo', casa, evento: e })
  }

  for (const [inizioTempo, fineTempo] of [
    [0, 45],
    [45, 90],
  ]) {
    let cursore = inizioTempo
    if (inizioTempo === 45) passa(44.9, 45, CENTRO.x, CENTRO.y)
    const azioni = eventi.filter((e) => tipoEvento(e) !== 'giallo' && (inizioTempo === 0 ? e.minuto <= 45 : e.minuto > 45))
    for (const e of azioni) {
      const tiro = Math.min(fineTempo - 0.1, Math.max(e.minuto, cursore + 0.4))
      if (tiro <= cursore + 0.2) continue
      const inizio = Math.max(cursore, tiro - 0.85)
      const fine = Math.min(fineTempo, tiro + (tipoEvento(e) === 'gol' ? 0.7 : 0.3))
      gioco(cursore, inizio)
      azione(e, inizio, tiro, fine)
      cursore = fine
    }
    gioco(cursore, fineTempo)
  }
  ultima().partenza = Infinity
  return { posti, segmenti, tappe, gialli }
}

function cerca<T>(elenco: T[], t: number, inizio: (x: T) => number): number {
  let lo = 0
  let hi = elenco.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (inizio(elenco[mid]) <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function segmentoA(scena: Scena, t: number): Segmento | undefined {
  const s = scena.segmenti[cerca(scena.segmenti, t, (x) => x.inizio)]
  return s && t >= s.inizio && t <= s.fine ? s : undefined
}

export function palla(scena: Scena, t: number): { x: number; y: number; h: number; ferma?: Tappa; prossima?: Tappa } {
  const i = cerca(scena.tappe, t, (x) => x.arrivo)
  const tappa = scena.tappe[i]
  const prossima = scena.tappe[i + 1]
  if (t <= tappa.partenza || !prossima) return { x: tappa.x, y: tappa.y, h: 0, ferma: tappa, prossima }
  const f = limita((t - tappa.partenza) / (prossima.arrivo - tappa.partenza), 0, 1)
  return {
    x: tappa.x + (prossima.x - tappa.x) * f,
    y: tappa.y + (prossima.y - tappa.y) * f,
    h: 4 * prossima.alta * f * (1 - f),
    prossima,
  }
}

export function statoScena(scena: Scena, t: number): Stato {
  const posti = scena.posti[t < 45 ? 0 : 1]
  const seg = segmentoA(scena, t)
  const b = palla(scena, t)
  const portatore = b.ferma?.id ?? null
  const segueX = (b.x - CENTRO.x) * 0.3
  const segueY = (b.y - CENTRO.y) * 0.3
  const esultanza = seg?.tipo === 'dopo' && seg.evento && tipoEvento(seg.evento) === 'gol' ? seg : undefined
  const marcatore = esultanza ? posti.find((q) => q.id === esultanza.evento!.marcatoreId) : undefined
  const bandierina = marcatore ? { x: portaAvversaria(marcatore.casa) - verso(marcatore.casa) * 3, y: marcatore.base.y < CENTRO.y ? 5 : 63 } : null

  const giocatori: StatoGiocatore[] = posti.map((q) => {
    const dir = verso(q.casa)
    let x: number
    let y: number
    if (q.ruolo === 'Goalkeeper') {
      const propria = q.casa ? 0 : LUNGHEZZA
      x = propria + dir * (2 + 0.08 * Math.abs(b.x - propria))
      y = CENTRO.y + (b.y - CENTRO.y) * 0.2
    } else {
      const inPossesso = seg ? seg.casa === q.casa : false
      const spinta = !seg ? 0 : seg.tipo === 'gioco' ? (inPossesso ? 6 : -3) : inPossesso ? 12 : -6
      x = q.base.x + dir * spinta + segueX
      y = q.base.y + segueY
    }
    if (bandierina && marcatore) {
      if (q === marcatore) ({ x, y } = bandierina)
      else if (q.casa === marcatore.casa && q.ruolo !== 'Goalkeeper') {
        x = x + (bandierina.x - x) * 0.6
        y = y + (bandierina.y - y) * 0.6
      } else if (q.casa !== marcatore.casa) ({ x, y } = q.base)
    }
    return { ...q, x, y, conPalla: q.id === portatore, giallo: false }
  })

  const conPalla = giocatori.find((g) => g.conPalla)
  if (conPalla && !esultanza) {
    conPalla.x = b.x - verso(conPalla.casa) * 0.7
    conPalla.y = b.y
  }
  // Chi riceverà il prossimo passaggio si muove in anticipo verso il punto d'incontro.
  if (b.prossima?.id && b.prossima.arrivo - t < 0.3 && !esultanza) {
    const ricevente = giocatori.find((g) => g.id === b.prossima!.id)
    if (ricevente && ricevente !== conPalla) {
      ricevente.x = b.prossima.x
      ricevente.y = b.prossima.y
    }
  }
  const squadraPalla = conPalla?.casa ?? seg?.casa
  if (squadraPalla !== undefined && !esultanza) {
    const pressante = giocatori
      .filter((g) => g.casa !== squadraPalla && g.ruolo !== 'Goalkeeper')
      .sort((g1, g2) => Math.hypot(g1.x - b.x, g1.y - b.y) - Math.hypot(g2.x - b.x, g2.y - b.y))[0]
    if (pressante) {
      pressante.x = b.x - verso(pressante.casa) * 2.2
      pressante.y = b.y + 0.8
    }
  }
  for (const g of scena.gialli) {
    if (Math.abs(t - g.minuto) < 0.35) {
      const ammonito = giocatori.find((x) => x.id === g.id)
      if (ammonito) ammonito.giallo = true
    }
  }

  for (const g of giocatori) {
    g.x = limita(g.x, 1, LUNGHEZZA - 1)
    g.y = limita(g.y, 1, LARGHEZZA - 1)
  }

  const evento = seg?.tipo === 'dopo' ? seg.evento : undefined
  return {
    giocatori,
    palla: { x: b.x, y: b.y, h: b.h },
    portatore,
    evidenza: evento ? { tipo: tipoEvento(evento), protagonista: evento.marcatoreId, casa: seg!.casa } : null,
    saliente: seg !== undefined && seg.tipo !== 'gioco',
  }
}
