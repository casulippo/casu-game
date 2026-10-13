import { CENTRO, disponi, forma, LARGHEZZA, limita, LUNGHEZZA, nelVerso, type Posto, type Punto } from '../../engine/campo'
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
    const inizio = Math.max(primo.t0, tiro.t0 - 0.6, tiro.t0 < 45 ? 0 : 45)
    const fine = Math.min(tiro.t0 < 45 ? 45 : 90, tiro.t1 + (tiro.esito === 'gol' ? 0.8 : 0.25))
    const prec = salienti.at(-1)
    if (prec && inizio <= prec.fine) {
      // Due tiri ravvicinati: un'unica sequenza da seguire, con l'esito dell'ultimo.
      Object.assign(prec, { tiro: tiro.t1, fine: Math.max(prec.fine, fine), esito: tiro.esito, tiratoreId: tiro.giocatoreId, casa: tiro.casa })
    } else salienti.push({ inizio, tiro: tiro.t1, fine, casa: tiro.casa, esito: tiro.esito, tiratoreId: tiro.giocatoreId })
  }
  const gialli = sim.eventi.filter((e) => tipoEvento(e) === 'giallo').map((e) => ({ t: e.t ?? e.minuto, id: e.marcatoreId }))
  return { periodi, tocchi, salienti, gialli }
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

// Avvicina una pedina alla posizione voluta senza superare una velocità di corsa credibile.
// Nelle azioni salienti ~9 m/s reali; nell'avanti veloce il tempo è compresso e si concede un po' di più.
export function insegui(p: { x: number; y: number }, obiettivo: { x: number; y: number }, dt: number, saliente: boolean) {
  if (!(dt > 0)) return { dx: 0, dy: 0 }
  const dx = (obiettivo.x - p.x) * (1 - Math.exp(-dt * 6))
  const dy = (obiettivo.y - p.y) * (1 - Math.exp(-dt * 6))
  const passo = Math.hypot(dx, dy)
  const massimo = (saliente ? 9 : 14) * dt
  const f = passo > massimo ? massimo / passo : 1
  p.x += dx * f
  p.y += dy * f
  return { dx: dx * f, dy: dy * f }
}

// Nell'avanti veloce i tocchi sono troppo fitti per seguirli uno a uno: la palla ne segue l'andamento.
// Nelle azioni salienti resta esatta, perché lì conta vedere ogni passaggio.
export function smorzaPalla(p: { x: number; y: number; h: number }, obiettivo: { x: number; y: number; h: number }, dt: number, saliente: boolean) {
  // Passando da un regime all'altro la palla aggancia la posizione esatta in pochi fotogrammi, senza scatti.
  const f = 1 - Math.exp(-Math.max(0, dt) * (saliente ? 30 : 5))
  p.x += (obiettivo.x - p.x) * f
  p.y += (obiettivo.y - p.y) * f
  p.h += ((saliente ? obiettivo.h : 0) - p.h) * f
}

// `riferimento`: nell'avanti veloce le squadre seguono la palla smorzata mostrata a schermo
// invece dei singoli tocchi, che a quella velocità sarebbero un flipper.
export function statoScena(scena: Scena, t: number, riferimento?: Punto): Stato {
  const posti = postiAl(scena, t)
  const vera = palla(scena, t)
  const b = riferimento ? { ...vera, x: riferimento.x, y: riferimento.y } : vera
  const tocco = b.tocco
  const ids = new Set(posti.map((q) => q.id))
  // Chi ha la palla: durante una conduzione chi la porta, a palla ferma chi l'ha ricevuta.
  let portatore: string | null = null
  if (tocco && b.inVolo && tocco.tipo === 'conduzione') portatore = tocco.giocatoreId
  else if (tocco && !b.inVolo) portatore = tocco.riceventeId
  if (portatore && !ids.has(portatore)) portatore = null
  const squadraDi = (id: string | null) => posti.find((q) => q.id === id)?.casa
  const possessoCasa = portatore ? squadraDi(portatore)! : tocco ? (b.inVolo ? tocco.casa : (squadraDi(tocco.riceventeId) ?? tocco.casa)) : true

  const s = salienteA(scena, t)
  const dopoGol = s && s.esito === 'gol' && t > s.tiro ? s : undefined
  const posizioni = forma(posti, b, dopoGol ? null : possessoCasa)

  if (portatore && !dopoGol) posizioni.set(portatore, { x: b.x - (squadraDi(portatore) ? 0.7 : -0.7), y: b.y })
  if (tocco && b.inVolo && tocco.riceventeId && ids.has(tocco.riceventeId) && tocco.riceventeId !== tocco.giocatoreId) {
    // Chi riceve va incontro al pallone e si fa trovare dove arriva.
    const f = limita((t - tocco.t0) / Math.max(0.001, tocco.t1 - tocco.t0), 0, 1)
    const da = posizioni.get(tocco.riceventeId)!
    posizioni.set(tocco.riceventeId, { x: da.x + (tocco.a.x - da.x) * f, y: da.y + (tocco.a.y - da.y) * f })
  }
  let pressanteId: string | null = null
  if (!dopoGol) {
    // Un solo avversario va a pressare, lo stesso per tutta la durata del tocco.
    const rif = tocco ? (b.inVolo ? tocco.da : tocco.a) : CENTRO
    let pressante: Posto | undefined
    let migliore = Infinity
    for (const q of posti) {
      if (q.casa === possessoCasa || q.ruolo === 'Goalkeeper') continue
      const p = nelVerso(q.base, q.casa)
      const r = nelVerso(rif, q.casa)
      const d = Math.hypot(p.x - r.x, p.y - r.y)
      if (d < migliore) {
        migliore = d
        pressante = q
      }
    }
    if (pressante) {
      pressanteId = pressante.id
      const verso = pressante.casa ? -1 : 1
      const da = posizioni.get(pressante.id)!
      posizioni.set(pressante.id, { x: da.x + (b.x + verso * 1.8 - da.x) * 0.85, y: da.y + (b.y + 0.6 - da.y) * 0.85 })
    }
  } else {
    // Esultanza: il marcatore corre verso la bandierina e i compagni lo raggiungono.
    const marcatore = posti.find((q) => q.id === dopoGol.tiratoreId)
    if (marcatore) {
      const porta = marcatore.casa ? LUNGHEZZA : 0
      const bandierina = { x: porta - (marcatore.casa ? 3 : -3), y: (posizioni.get(marcatore.id)?.y ?? CENTRO.y) < CENTRO.y ? 5 : 63 }
      for (const q of posti) {
        if (q.casa !== marcatore.casa || q.ruolo === 'Goalkeeper') continue
        const da = posizioni.get(q.id)!
        const f = q === marcatore ? 1 : 0.6
        posizioni.set(q.id, { x: da.x + (bandierina.x - da.x) * f, y: da.y + (bandierina.y - da.y) * f })
      }
    }
  }

  if (!dopoGol) {
    const ricevente = tocco && b.inVolo ? tocco.riceventeId : null
    const fermi = new Set([portatore, ricevente, pressanteId])
    const base = new Map([...posizioni].map(([id, p]) => [id, { ...p }]))
    for (const q of posti) {
      if (q.ruolo === 'Goalkeeper' || fermi.has(q.id)) continue
      const p = posizioni.get(q.id)!
      if (q.casa !== possessoCasa) {
        // Marcatura: il difensore si avvicina all'avversario più vicino alla sua zona, restando tra lui e la porta.
        let avversario: Punto | undefined
        let d = 14
        for (const a of posti) {
          if (a.casa === q.casa || a.ruolo === 'Goalkeeper') continue
          const pa = base.get(a.id)!
          const da = Math.hypot(pa.x - p.x, pa.y - p.y)
          if (da < d) {
            d = da
            avversario = pa
          }
        }
        if (avversario) {
          const lato = q.casa ? -2 : 2
          p.x += (avversario.x + lato - p.x) * 0.45
          p.y += (avversario.y - p.y) * 0.45
        }
      } else {
        // Smarcamento: chi è vicino alla palla si avvicina per offrire una linea di passaggio, senza ammassarsi.
        const d = Math.hypot(b.x - p.x, b.y - p.y)
        if (d < 28 && d > 9) {
          const f = 0.22 * (1 - d / 28)
          p.x += (b.x - p.x) * f
          p.y += (b.y - p.y) * f
        }
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
  return { giocatori, palla: { x: vera.x, y: vera.y, h: vera.h }, portatore, possessoCasa, evidenza, saliente: s !== undefined }
}

function hash(s: string): number {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) / 4294967296
}

// Movimento continuo senza palla, in tempo reale: aggiustamenti di posizione, piccoli scatti, corse incontro.
// È solo estetico: non cambia nulla di ciò che decide il motore.
export function vivacita(g: StatoGiocatore, secondi: number, possessoCasa: boolean): { x: number; y: number } {
  if (g.conPalla) return { x: 0, y: 0 }
  const h = hash(g.id)
  const fase = h * Math.PI * 2
  const omega = 0.7 + h * 0.6
  if (g.ruolo === 'Goalkeeper') return { x: 0, y: Math.sin(secondi * omega + fase) * 0.8 }
  const attacca = g.casa === possessoCasa
  const ampiezzaX = attacca ? (g.ruolo === 'Defender' ? 2 : 4) : 1.5
  const ampiezzaY = attacca ? 3 : 2.5
  const verso = g.casa ? 1 : -1
  return {
    x: verso * Math.sin(secondi * omega + fase) * ampiezzaX,
    y: Math.sin(secondi * omega * 0.73 + fase * 1.7) * ampiezzaY,
  }
}

export type { Punto }
