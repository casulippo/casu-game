import { CENTRO, disponi, forma, LARGHEZZA, limita, LUNGHEZZA, type Posto, type Punto } from '../../engine/campo'
import { xiAlMinuto, type Fase, type Simulazione, type Tocco } from '../../engine/simulazione'
import { tipoEvento, type Giocatore, type TipoEvento } from '../../engine/tipi'

export { LARGHEZZA, LUNGHEZZA, type Posto }

// La regia non inventa nulla: riproduce i tocchi del motore e ci mette intorno i movimenti dei giocatori.

interface Periodo {
  da: number
  posti: Posto[]
}

// Tratto da seguire a velocità reale: l'azione che porta a un tiro e quello che succede subito dopo.
export interface Saliente {
  inizio: number
  tiro: number
  fine: number
  casa: boolean
  esito: Tocco['esito']
  tiratoreId: string
}

export interface Scena {
  periodi: Periodo[]
  tocchi: Tocco[]
  // Istanti in cui cambia la squadra in possesso.
  possessi: { t: number; casa: boolean }[]
  salienti: Saliente[]
  gialli: { t: number; id: string }[]
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
  possessoCasa: boolean
  // Quota di possesso recente della squadra di casa (0-1), per movimenti senza scatti.
  quotaCasa: number
  // Squadra che ha davvero la palla in questo istante, secondo il motore.
  squadraPalla: boolean
  evidenza: { tipo: TipoEvento; protagonista: string; casa: boolean } | null
  saliente: boolean
}

export interface FormazioniPartita {
  casa: { base: Giocatore[]; fasi: Fase[] }
  ospite: { base: Giocatore[]; fasi: Fase[] }
}

const minutoDi = (t: number) => Math.min(90, Math.floor(t) + 1)

export const postiAl = (scena: Scena, t: number) => {
  const m = minutoDi(t)
  return scena.periodi.filter((p) => p.da <= m).at(-1)!.posti
}

const ESITI_TIRO = new Set(['gol', 'parata', 'fuori', 'palo'])

export function creaScena(sim: Simulazione, xi: FormazioniPartita): Scena {
  const inizi = [...new Set([1, ...xi.casa.fasi.map((f) => f.da), ...xi.ospite.fasi.map((f) => f.da)])].sort((a, b) => a - b)
  const periodi = inizi.map((da) => ({
    da,
    posti: [...disponi(xiAlMinuto(xi.casa.base, xi.casa.fasi, da), true), ...disponi(xiAlMinuto(xi.ospite.base, xi.ospite.fasi, da), false)],
  }))
  const tocchi = [...sim.tocchi].sort((a, b) => a.t0 - b.t0)
  const salienti: Saliente[] = []
  for (const tiro of tocchi.filter((x) => x.tipo === 'tiro' && ESITI_TIRO.has(x.esito))) {
    const primo = tocchi.find((x) => x.possesso === tiro.possesso)!
    const inizio = Math.max(primo.t0, tiro.t0 - 0.3, tiro.t0 < 45 ? 0 : 45)
    const fine = Math.min(tiro.t0 < 45 ? 45 : 90, tiro.t1 + (tiro.esito === 'gol' ? 0.5 : 0.15))
    const prec = salienti.at(-1)
    if (prec && inizio <= prec.fine) {
      // Due tiri ravvicinati: un'unica sequenza da seguire, con l'esito dell'ultimo.
      Object.assign(prec, { tiro: tiro.t1, fine: Math.max(prec.fine, fine), esito: tiro.esito, tiratoreId: tiro.giocatoreId, casa: tiro.casa })
    } else salienti.push({ inizio, tiro: tiro.t1, fine, casa: tiro.casa, esito: tiro.esito, tiratoreId: tiro.giocatoreId })
  }
  const gialli = sim.eventi.filter((e) => tipoEvento(e) === 'giallo').map((e) => ({ t: e.t ?? e.minuto, id: e.marcatoreId }))
  const casaIds = new Set(periodi.flatMap((p) => p.posti.filter((q) => q.casa).map((q) => q.id)))
  const possessi: Scena['possessi'] = []
  const segna = (t: number, casa: boolean) => {
    if (possessi.at(-1)?.casa !== casa) possessi.push({ t, casa })
  }
  for (const x of tocchi) {
    segna(x.t0, x.casa)
    if (x.riceventeId) segna(x.t1, casaIds.has(x.riceventeId))
  }
  return { periodi, tocchi, possessi, salienti, gialli }
}

function cerca<T>(elenco: T[], t: number, inizio: (x: T) => number): number {
  let lo = 0
  let hi = elenco.length - 1
  if (hi < 0 || inizio(elenco[0]) > t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (inizio(elenco[mid]) <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function salienteA(scena: Scena, t: number): Saliente | undefined {
  const i = cerca(scena.salienti, t, (s) => s.inizio)
  const s = scena.salienti[i]
  return s && t <= s.fine ? s : undefined
}

interface Palla {
  x: number
  y: number
  h: number
  // Tocco in corso (palla in movimento) o ultimo concluso (palla ferma).
  tocco?: Tocco
  inVolo: boolean
}

export function palla(scena: Scena, t: number): Palla {
  // Inizio ripresa: durante l'intervallo la palla è già al centro, in attesa del primo tocco.
  const ripresa = scena.tocchi.find((x) => x.t0 >= 45)
  if (ripresa && t >= 45 && t < ripresa.t0) return { x: ripresa.da.x, y: ripresa.da.y, h: 0, inVolo: false }
  const i = cerca(scena.tocchi, t, (x) => x.t0)
  if (i < 0) return { ...CENTRO, h: 0, inVolo: false }
  const tocco = scena.tocchi[i]
  if (t <= tocco.t1) {
    const f = tocco.t1 > tocco.t0 ? limita((t - tocco.t0) / (tocco.t1 - tocco.t0), 0, 1) : 1
    return {
      x: tocco.da.x + (tocco.a.x - tocco.da.x) * f,
      y: tocco.da.y + (tocco.a.y - tocco.da.y) * f,
      h: 4 * tocco.alta * f * (1 - f),
      tocco,
      inVolo: true,
    }
  }
  // Tra un tocco e l'altro: la palla resta dove è arrivata; se il tocco successivo parte da un
  // altro punto (calcio d'inizio, rimessa dal fondo) ci viene riportata nell'ultima parte della pausa.
  const prossimo = scena.tocchi[i + 1]
  if (prossimo && (prossimo.da.x !== tocco.a.x || prossimo.da.y !== tocco.a.y)) {
    const pausa = prossimo.t0 - tocco.t1
    const avvio = prossimo.t0 - Math.min(pausa, Math.max(0.05, pausa * 0.4))
    if (t > avvio) {
      const f = limita((t - avvio) / (prossimo.t0 - avvio), 0, 1)
      return { x: tocco.a.x + (prossimo.da.x - tocco.a.x) * f, y: tocco.a.y + (prossimo.da.y - tocco.a.y) * f, h: 0, tocco, inVolo: false }
    }
  }
  return { x: tocco.a.x, y: tocco.a.y, h: 0, tocco, inVolo: false }
}

// Avvicina una pedina alla posizione voluta senza superare `velocitaMax` (metri per secondo reale).
export function insegui(p: { x: number; y: number }, obiettivo: { x: number; y: number }, dt: number, velocitaMax: number) {
  if (!(dt > 0)) return { dx: 0, dy: 0 }
  const dx = (obiettivo.x - p.x) * (1 - Math.exp(-dt * 6))
  const dy = (obiettivo.y - p.y) * (1 - Math.exp(-dt * 6))
  const passo = Math.hypot(dx, dy)
  const massimo = velocitaMax * dt
  const f = passo > massimo ? massimo / passo : 1
  p.x += dx * f
  p.y += dy * f
  return { dx: dx * f, dy: dy * f }
}

// Quota di possesso della squadra di casa nell'ultimo tratto di gioco (0-1): la forma delle squadre
// la segue gradualmente invece di scattare da attacco a difesa a ogni recupero.
function quotaPossessoCasa(scena: Scena, t: number, finestra: number): number {
  const cambi = scena.possessi
  if (!cambi.length) return 0.5
  const da = t - finestra
  let casa = 0
  // Prima del primo cambio la palla è della squadra che batte il calcio d'inizio.
  if (cambi[0].t > da && cambi[0].casa) casa += Math.max(0, Math.min(t, cambi[0].t) - da)
  for (let i = Math.max(0, cerca(cambi, da, (c) => c.t)); i < cambi.length && cambi[i].t < t; i++) {
    const a = Math.max(da, cambi[i].t)
    const b = Math.min(t, cambi[i + 1]?.t ?? t)
    if (b > a && cambi[i].casa) casa += b - a
  }
  return limita(casa / finestra, 0, 1)
}

const rampa = (x: number) => limita(x, 0, 1)
const mescola = (a: Punto, b: Punto, f: number): Punto => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })

// Il più vicino al punto tra i giocatori ammessi, misurato sui posti di partenza: scelta stabile.
function piuVicinoAlPosto(posti: Posto[], punto: Punto, ammesso: (q: Posto) => boolean): Posto | undefined {
  let migliore: Posto | undefined
  let d = Infinity
  for (const q of posti) {
    if (!ammesso(q)) continue
    const dq = Math.hypot(q.base.x - punto.x, q.base.y - punto.y)
    if (dq < d) {
      d = dq
      migliore = q
    }
  }
  return migliore
}

// `riferimento`: nell'avanti veloce le squadre seguono la palla smorzata mostrata a schermo
// invece dei singoli tocchi, che a quella velocità sarebbero un flipper.
export function statoScena(scena: Scena, t: number, riferimento?: Punto): Stato {
  const posti = postiAl(scena, t)
  const vera = palla(scena, t)
  const b = riferimento ? { ...vera, x: riferimento.x, y: riferimento.y } : vera
  const tocco = b.tocco
  const ids = new Set(posti.map((q) => q.id))
  const squadraDi = (id: string | null | undefined) => (id ? posti.find((q) => q.id === id)?.casa : undefined)
  // Chi ha la palla: durante una conduzione chi la porta, a palla ferma chi l'ha ricevuta.
  let portatore: string | null = null
  // Nell'avanti veloce il portatore cambierebbe ogni pochi fotogrammi: lo sceglie l'animatore, con calma.
  if (!riferimento && tocco && b.inVolo && tocco.tipo === 'conduzione') portatore = tocco.giocatoreId
  else if (!riferimento && tocco && !b.inVolo) portatore = tocco.riceventeId
  if (portatore && !ids.has(portatore)) portatore = null
  const quotaCasa = quotaPossessoCasa(scena, t, riferimento ? 0.8 : 0.15)
  const squadraPalla = tocco ? (b.inVolo ? tocco.casa : (squadraDi(tocco.riceventeId) ?? tocco.casa)) : true
  const possessoCasa = portatore ? squadraDi(portatore)! : quotaCasa >= 0.5

  const s = salienteA(scena, t)
  const esultanza = s && s.esito === 'gol' && t > s.tiro ? s : undefined

  // 1. Forma di squadra, mescolata secondo il possesso recente.
  const attaccaCasa = forma(posti, b, true)
  const attaccaOspite = forma(posti, b, false)
  const posizioni = new Map<string, Punto>()
  for (const q of posti) posizioni.set(q.id, mescola(attaccaOspite.get(q.id)!, attaccaCasa.get(q.id)!, quotaCasa))

  // 2. Marcature e smarcamenti, con pesi che variano con continuità.
  const iniziali = new Map([...posizioni].map(([id, p]) => [id, { ...p }]))
  for (const q of posti) {
    if (q.ruolo === 'Goalkeeper') continue
    const p = posizioni.get(q.id)!
    const difende = q.casa ? 1 - quotaCasa : quotaCasa
    const avversario = piuVicinoAlPosto(posti, q.base, (a) => a.casa !== q.casa && a.ruolo !== 'Goalkeeper')
    if (avversario && difende > 0) {
      const pa = iniziali.get(avversario.id)!
      const d = Math.hypot(pa.x - p.x, pa.y - p.y)
      const dietro = { x: pa.x + (q.casa ? -2 : 2), y: pa.y }
      Object.assign(p, mescola(p, dietro, 0.45 * difende * rampa((15 - d) / 6)))
    }
    const attacca = 1 - difende
    const d = Math.hypot(b.x - p.x, b.y - p.y)
    Object.assign(p, mescola(p, b, 0.22 * attacca * rampa((d - 6) / 6) * rampa((28 - d) / 10)))
  }

  // 3. Pressing: un avversario per tocco, che entra ed esce gradualmente. Solo nelle azioni seguite tocco per tocco.
  if (tocco && !riferimento) {
    const indice = scena.tocchi.indexOf(tocco)
    const pressa = (x: Tocco, peso: number) => {
      const attaccante = squadraDi(x.riceventeId) ?? x.casa
      const chi = piuVicinoAlPosto(posti, x.a, (q) => q.casa !== attaccante && q.ruolo !== 'Goalkeeper')
      if (!chi || peso <= 0) return
      const p = posizioni.get(chi.id)!
      Object.assign(p, mescola(p, { x: b.x + (chi.casa ? -1.8 : 1.8), y: b.y + 0.6 }, 0.85 * peso))
    }
    const entrata = rampa((t - tocco.t0) / 0.06)
    pressa(tocco, entrata)
    const precedente = scena.tocchi[indice - 1]
    if (precedente) pressa(precedente, 1 - entrata)
  }

  // 4. Chi passa parte dal punto del passaggio; chi riceve va incontro al pallone.
  if (tocco && !riferimento && b.inVolo && tocco.tipo !== 'conduzione') {
    const f = rampa((t - tocco.t0) / Math.max(0.001, tocco.t1 - tocco.t0))
    if (ids.has(tocco.giocatoreId)) {
      const p = posizioni.get(tocco.giocatoreId)!
      Object.assign(p, mescola(tocco.da, p, f))
    }
    if (tocco.riceventeId && ids.has(tocco.riceventeId)) {
      const p = posizioni.get(tocco.riceventeId)!
      Object.assign(p, mescola(p, tocco.a, f))
    }
  }
  if (portatore) posizioni.set(portatore, { x: b.x - (squadraDi(portatore) ? 0.7 : -0.7), y: b.y })

  // 5. Esultanza dopo un gol: il marcatore corre verso la bandierina e i compagni lo raggiungono.
  if (esultanza) {
    const marcatore = posti.find((q) => q.id === esultanza.tiratoreId)
    if (marcatore) {
      const porta = marcatore.casa ? LUNGHEZZA : 0
      const entrata = rampa((t - esultanza.tiro) / 0.15)
      const bandierina = { x: porta - (marcatore.casa ? 3 : -3), y: marcatore.base.y < CENTRO.y ? 5 : 63 }
      for (const q of posti) {
        if (q.casa !== marcatore.casa || q.ruolo === 'Goalkeeper') continue
        const p = posizioni.get(q.id)!
        Object.assign(p, mescola(p, bandierina, (q === marcatore ? 1 : 0.6) * entrata))
      }
    }
  }

  const giocatori: StatoGiocatore[] = posti.map((q) => {
    const p = posizioni.get(q.id)!
    return {
      ...q,
      x: limita(p.x, 1, LUNGHEZZA - 1),
      y: limita(p.y, 1, LARGHEZZA - 1),
      conPalla: q.id === portatore,
      giallo: scena.gialli.some((g) => g.id === q.id && Math.abs(t - g.t) < 0.3),
    }
  })

  const evidenza: Stato['evidenza'] =
    s && t > s.tiro
      ? { tipo: s.esito === 'gol' || s.esito === 'parata' || s.esito === 'palo' ? s.esito : 'fuori', protagonista: s.tiratoreId, casa: s.casa }
      : null
  return { giocatori, palla: { x: vera.x, y: vera.y, h: vera.h }, portatore, possessoCasa, quotaCasa, squadraPalla, evidenza, saliente: s !== undefined }
}

function hash(s: string): number {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967296
}

// Movimento continuo senza palla, in tempo reale: aggiustamenti di posizione, piccoli scatti, corse incontro.
// È solo estetico: non cambia nulla di ciò che decide il motore.
export function vivacita(g: StatoGiocatore, secondi: number, quotaCasa: number): { x: number; y: number } {
  if (g.conPalla) return { x: 0, y: 0 }
  const h = hash(g.id)
  const fase = h * Math.PI * 2
  const omega = 0.7 + h * 0.6
  if (g.ruolo === 'Goalkeeper') return { x: 0, y: Math.sin(secondi * omega + fase) * 0.8 }
  const attacca = g.casa ? quotaCasa : 1 - quotaCasa
  const ampiezzaX = 1.5 + attacca * ((g.ruolo === 'Defender' ? 2 : 4) - 1.5)
  const ampiezzaY = 2.5 + attacca * 0.5
  const verso = g.casa ? 1 : -1
  return {
    x: verso * Math.sin(secondi * omega + fase) * ampiezzaX,
    y: Math.sin(secondi * omega * 0.73 + fase * 1.7) * ampiezzaY,
  }
}

export type { Punto }
