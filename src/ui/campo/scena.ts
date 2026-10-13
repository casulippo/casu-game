import type { Ruolo } from '../../engine/attributi'
import { xiAlMinuto, type Fase } from '../../engine/partita'
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

// Giocatori in campo dal minuto `da`: cambia a ogni sostituzione o cambio di modulo.
interface Periodo {
  da: number
  posti: Posto[]
}

export interface Scena {
  periodi: Periodo[]
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
  casa: { base: Giocatore[]; fasi: Fase[] }
  ospite: { base: Giocatore[]; fasi: Fase[] }
}

// Il tempo t (minuti con decimali) cade nel minuto floor(t)+1: è quello in corso.
const minutoDi = (t: number) => Math.min(90, Math.floor(t) + 1)

export const postiAl = (scena: Scena, t: number) => {
  const m = minutoDi(t)
  return scena.periodi.filter((p) => p.da <= m).at(-1)!.posti
}

export function creaScena(p: Partita, xi: FormazioniPartita, possessoCasa: number, seme: string): Scena {
  const r = rng(`scena:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`)
  const inizi = [...new Set([1, ...xi.casa.fasi.map((f) => f.da), ...xi.ospite.fasi.map((f) => f.da)])].sort((a, b) => a - b)
  const periodi: Periodo[] = inizi.map((da) => ({
    da,
    posti: [
      ...disponi(xiAlMinuto(xi.casa.base, xi.casa.fasi, da), true),
      ...disponi(xiAlMinuto(xi.ospite.base, xi.ospite.fasi, da), false),
    ],
  }))
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
  const postiDi = (t: number, casa: boolean) =>
    periodi.filter((x) => x.da <= minutoDi(t)).at(-1)!.posti.filter((q) => q.casa === casa)
  const avanzato = (q: Posto, quanto: number) => ({ x: q.base.x + verso(q.casa) * quanto, y: q.base.y })
  const scegli = <T,>(rr: Rng, a: T[]) => a[Math.floor(rr() * a.length)]
  const altezzaPassaggio = (x: number, y: number) => (Math.hypot(x - ultima().x, y - ultima().y) > 28 ? 2.5 : 0)

  const gioco = (a: number, b: number) => {
    let t = a
    while (t < b - 0.05) {
      const durata = Math.min(b - t, 0.8 + r() * 2.2)
      const casa = r() * 100 < possessoCasa
      const squadra = postiDi(t, casa).filter((q) => q.ruolo !== 'Goalkeeper')
      // Nell'avanti veloce un minuto dura meno di mezzo secondo: pochi passaggi, altrimenti è un flipper.
      const passaggi = Math.max(1, Math.round(durata / 1.1))
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
        const x = pos.x + (r() - 0.5) * 5
        const y = pos.y + (r() - 0.5) * 5
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
    // Chi è in campo nel minuto dell'evento: un subentrato può segnare appena entrato.
    const squadra = postiDi(e.minuto - 0.5, casa)
    const portiere = postiDi(e.minuto - 0.5, !casa).find((q) => q.ruolo === 'Goalkeeper')
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
      passa(fine - 0.12, fine, CENTRO.x, CENTRO.y, undefined, 0, 600)
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
    // Durante l'intervallo l'orologio è fermo: la palla torna al centro senza che si veda.
    if (inizioTempo === 45) passa(44.9, 45, CENTRO.x, CENTRO.y, undefined, 0, 10_000)
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
  return { periodi, segmenti, tappe, gialli }
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

// Avvicina una pedina alla posizione voluta senza superare una velocità di corsa credibile.
// Nelle azioni salienti ~9 m/s reali; nell'avanti veloce il tempo è compresso e si concede di più.
export function insegui(p: { x: number; y: number }, obiettivo: { x: number; y: number }, dt: number, saliente: boolean) {
  if (!(dt > 0)) return { dx: 0, dy: 0 }
  const dx = (obiettivo.x - p.x) * (1 - Math.exp(-dt * 6))
  const dy = (obiettivo.y - p.y) * (1 - Math.exp(-dt * 6))
  const passo = Math.hypot(dx, dy)
  const massimo = (saliente ? 9 : 30) * dt
  const f = passo > massimo ? massimo / passo : 1
  p.x += dx * f
  p.y += dy * f
  return { dx: dx * f, dy: dy * f }
}

export function statoScena(scena: Scena, t: number): Stato {
  const posti = postiAl(scena, t)
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
      // Nel gioco normale il blocco si sposta poco: il possesso cambia spesso e la squadra non può fare l'elastico.
      const spinta = !seg ? 0 : seg.tipo === 'gioco' ? (inPossesso ? 4 : -2) : inPossesso ? 12 : -6
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
  // Chi riceverà il prossimo passaggio si avvicina gradualmente al punto d'incontro.
  if (b.prossima?.id && !esultanza) {
    const ricevente = giocatori.find((g) => g.id === b.prossima!.id)
    const f = limita(1 - (b.prossima.arrivo - t) / 0.3, 0, 1)
    if (ricevente && ricevente !== conPalla && f > 0) {
      ricevente.x += (b.prossima.x - ricevente.x) * f
      ricevente.y += (b.prossima.y - ricevente.y) * f
    }
  }
  // Pressa un solo avversario, scelto per tutta la durata del possesso di quel giocatore: niente scambi di ruolo a ogni fotogramma.
  const riferimento = b.ferma ?? b.prossima
  const squadraPalla = conPalla?.casa ?? seg?.casa
  if (riferimento && squadraPalla !== undefined && !esultanza) {
    const pressante = giocatori
      .filter((g) => g.casa !== squadraPalla && g.ruolo !== 'Goalkeeper')
      .sort(
        (g1, g2) =>
          Math.hypot(g1.base.x - riferimento.x, g1.base.y - riferimento.y) -
          Math.hypot(g2.base.x - riferimento.x, g2.base.y - riferimento.y),
      )[0]
    if (pressante) {
      pressante.x += (b.x - verso(pressante.casa) * 2.2 - pressante.x) * 0.85
      pressante.y += (b.y + 0.8 - pressante.y) * 0.85
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
