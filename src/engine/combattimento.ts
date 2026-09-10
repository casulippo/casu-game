import type { Griglia } from './iso'
import { armaPerId, type DatiArma, type TipoArma } from './armi'

/**
 * Il combattimento, in tempo reale.
 *
 * Le orde arrivano addosso come in Vampire Survivors, ma il colpo lo decide il
 * giocatore: si spara premendo, non in automatico. Si schivano gli uomini e i
 * proiettili e si risponde al fuoco.
 *
 * Tutto quello che sta qui è stato più `avanza(scontro, dt, comandi)`: nessun
 * canvas, nessun `Math.random` sparso. Il caso passa da un seme dentro lo
 * scontro, così una sparatoria si rigioca identica in un test.
 */

export type TipoNemico = 'banda' | 'poliziotto' | 'passante'

/** Chi sta in piedi nello scontro. */
export interface Corpo {
  id: number
  pos: Griglia
  vita: number
  vitaMax: number
}

export interface Nemico extends Corpo {
  tipo: TipoNemico
  arma: TipoArma
  /** Secondi che mancano al prossimo colpo. */
  ricarica: number
}

export interface Proiettile {
  id: number
  pos: Griglia
  /** Celle al secondo, già scomposte sui due assi. */
  vel: Griglia
  danno: number
  /** Quante celle può ancora percorrere prima di cadere. */
  gittataResidua: number
  delGiocatore: boolean
}

/** Il protagonista dentro lo scontro: non è il `Giocatore` dello stato di gioco. */
export interface Combattente extends Corpo {
  arma: TipoArma
  ricarica: number
  /** Da 0 a 100: alza la precisione, cioè stringe la dispersione dell'arma. */
  mira: number
}

export type EsitoScontro = 'in-corso' | 'vinto' | 'perso' | 'scampato'

export interface Scontro {
  /**
   * I raid della storia si affrontano e basta; quelli che nascono dallo spaccio
   * rientrano da soli se ci si sa nascondere abbastanza a lungo.
   */
  evitabile: boolean
  giocatore: Combattente
  nemici: Nemico[]
  proiettili: Proiettile[]
  /** Secondi dall'inizio dello scontro. */
  tempo: number
  /** Da quanti secondi nessuno ti vede. Due minuti e il raid finisce. */
  tempoNascosto: number
  esito: EsitoScontro
  /** Il seme del caso: dispersione dei colpi e nient'altro. */
  seme: number
  prossimoId: number
}

export interface Comandi {
  /** Dove si sta andando, come vettore non normalizzato. Zero se fermi. */
  direzione: Griglia
  /** Dove si punta. Se manca, si spara verso l'ultima direzione presa. */
  mira: Griglia | null
  spara: boolean
}

export type Evento =
  | { tipo: 'nemico-abbattuto'; nemico: TipoNemico }
  | { tipo: 'passante-colpito' }
  | { tipo: 'giocatore-colpito'; danno: number }
  | { tipo: 'esito'; esito: EsitoScontro }

/** Quanto si scappa prima che un raid evitabile rientri, in secondi. */
export const TEMPO_FUGA = 120

/** Oltre questa distanza, in celle, nessuno ti vede più. */
export const DISTANZA_VISTA = 8

/** Celle al secondo. */
const VELOCITA_GIOCATORE = 4
const VELOCITA: Record<TipoNemico, number> = {
  banda: 3.2,
  poliziotto: 2.8,
  passante: 1.4,
}

const VITA: Record<TipoNemico, number> = {
  banda: 40,
  poliziotto: 55,
  passante: 25,
}

const ARMA_DI: Record<TipoNemico, TipoArma> = {
  banda: 'coltello',
  poliziotto: 'pistola',
  passante: 'coltello',
}

/** Quanto si tiene lontano chi spara, in celle: addosso non ci viene. */
const DISTANZA_DI_TIRO = 6

/** Raggio di un corpo, in celle: sotto questa distanza il proiettile prende. */
const RAGGIO_CORPO = 0.45

export interface SpecNemico {
  tipo: TipoNemico
  pos: Griglia
}

export function iniziaScontro(opzioni: {
  posGiocatore: Griglia
  arma: TipoArma
  vita: number
  mira: number
  nemici: SpecNemico[]
  evitabile?: boolean
  seme?: number
}): Scontro {
  let prossimoId = 1

  return {
    evitabile: opzioni.evitabile ?? true,
    giocatore: {
      id: 0,
      pos: { ...opzioni.posGiocatore },
      vita: opzioni.vita,
      vitaMax: opzioni.vita,
      arma: opzioni.arma,
      ricarica: 0,
      mira: opzioni.mira,
    },
    nemici: opzioni.nemici.map((n) => ({
      id: prossimoId++,
      tipo: n.tipo,
      pos: { ...n.pos },
      vita: VITA[n.tipo],
      vitaMax: VITA[n.tipo],
      arma: ARMA_DI[n.tipo],
      ricarica: 0,
    })),
    proiettili: [],
    tempo: 0,
    tempoNascosto: 0,
    esito: 'in-corso',
    seme: opzioni.seme ?? 1,
    prossimoId,
  }
}

export interface PassoScontro {
  scontro: Scontro
  eventi: Evento[]
}

/**
 * Un passo di scontro.
 *
 * L'ordine conta: prima ci si muove, poi si spara, poi volano i proiettili,
 * infine si guarda com'è finita. Chi muore in questo passo ha comunque fatto
 * in tempo a premere il grilletto.
 */
export function avanza(scontro: Scontro, dt: number, comandi: Comandi): PassoScontro {
  if (scontro.esito !== 'in-corso' || dt <= 0) return { scontro, eventi: [] }

  const eventi: Evento[] = []
  const s = clona(scontro)

  s.tempo += dt

  muoviGiocatore(s, dt, comandi)
  const direzioneDiTiro = mira(s, comandi)

  sparaGiocatore(s, dt, comandi, direzioneDiTiro)
  muoviNemici(s, dt)
  volanoIProiettili(s, dt, eventi)

  aggiornaFuga(s, dt)
  concludi(s, eventi)

  return { scontro: s, eventi }
}

function muoviGiocatore(s: Scontro, dt: number, comandi: Comandi) {
  const dir = normalizza(comandi.direzione)
  s.giocatore.pos = {
    x: s.giocatore.pos.x + dir.x * VELOCITA_GIOCATORE * dt,
    y: s.giocatore.pos.y + dir.y * VELOCITA_GIOCATORE * dt,
  }
}

/** Dove si punta: la mira esplicita, o il verso in cui si sta andando. */
function mira(s: Scontro, comandi: Comandi): Griglia {
  const scelta = comandi.mira ?? comandi.direzione
  const dir = normalizza(scelta)
  if (dir.x !== 0 || dir.y !== 0) return dir

  const vicino = piuVicino(s)
  return vicino
    ? normalizza({ x: vicino.pos.x - s.giocatore.pos.x, y: vicino.pos.y - s.giocatore.pos.y })
    : { x: 0, y: 1 }
}

function sparaGiocatore(s: Scontro, dt: number, comandi: Comandi, verso: Griglia) {
  s.giocatore.ricarica = Math.max(0, s.giocatore.ricarica - dt)
  if (!comandi.spara || s.giocatore.ricarica > 0) return

  const arma = armaPerId(s.giocatore.arma)
  s.giocatore.ricarica = arma.cadenza

  if (arma.corpoACorpo) {
    colpisciDavanti(s, arma, verso)
    return
  }

  // La mira stringe la dispersione: a 100 il colpo va dove punti.
  const errore = arma.dispersione * (1 - s.giocatore.mira / 100)
  s.proiettili.push(
    proiettile(s, s.giocatore.pos, ruota(verso, (caso(s) - 0.5) * 2 * errore), arma, true),
  )
}

/** Il coltello: prende chi ti sta davanti, dentro un cono largo. */
function colpisciDavanti(s: Scontro, arma: DatiArma, verso: Griglia) {
  for (const nemico of s.nemici) {
    const versoNemico = {
      x: nemico.pos.x - s.giocatore.pos.x,
      y: nemico.pos.y - s.giocatore.pos.y,
    }
    const distanza = Math.hypot(versoNemico.x, versoNemico.y)
    if (distanza > arma.gittata) continue

    const dir = normalizza(versoNemico)
    // Prodotto scalare: sopra 0.3 è "davanti", cioè un cono di un centinaio di gradi.
    if (dir.x * verso.x + dir.y * verso.y < 0.3) continue

    nemico.vita -= arma.danno
  }
}

function muoviNemici(s: Scontro, dt: number) {
  for (const nemico of s.nemici) {
    const arma = armaPerId(nemico.arma)
    const versoIlGiocatore = {
      x: s.giocatore.pos.x - nemico.pos.x,
      y: s.giocatore.pos.y - nemico.pos.y,
    }
    const distanza = Math.hypot(versoIlGiocatore.x, versoIlGiocatore.y)
    const dir = normalizza(versoIlGiocatore)

    if (nemico.tipo === 'passante') {
      // I passanti non attaccano: scappano dalla parte opposta.
      if (distanza < DISTANZA_VISTA) {
        nemico.pos = {
          x: nemico.pos.x - dir.x * VELOCITA.passante * dt,
          y: nemico.pos.y - dir.y * VELOCITA.passante * dt,
        }
      }
      continue
    }

    // Chi spara si tiene a distanza, chi ha il coltello viene addosso.
    const distanzaVoluta = arma.corpoACorpo ? arma.gittata * 0.7 : DISTANZA_DI_TIRO
    if (Math.abs(distanza - distanzaVoluta) > 0.3) {
      const verso = distanza > distanzaVoluta ? 1 : -1
      nemico.pos = {
        x: nemico.pos.x + dir.x * VELOCITA[nemico.tipo] * verso * dt,
        y: nemico.pos.y + dir.y * VELOCITA[nemico.tipo] * verso * dt,
      }
    }

    nemico.ricarica = Math.max(0, nemico.ricarica - dt)
    if (nemico.ricarica > 0 || distanza > arma.gittata) continue

    nemico.ricarica = arma.cadenza
    if (arma.corpoACorpo) {
      s.giocatore.vita -= arma.danno
    } else {
      const errore = arma.dispersione
      s.proiettili.push(
        proiettile(s, nemico.pos, ruota(dir, (caso(s) - 0.5) * 2 * errore), arma, false),
      )
    }
  }
}

function volanoIProiettili(s: Scontro, dt: number, eventi: Evento[]) {
  const vivi: Proiettile[] = []

  for (const p of s.proiettili) {
    const passo = Math.hypot(p.vel.x, p.vel.y) * dt
    p.pos = { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt }
    p.gittataResidua -= passo

    const bersaglio = colpito(s, p)
    if (bersaglio) {
      bersaglio.vita -= p.danno
      if (!p.delGiocatore) eventi.push({ tipo: 'giocatore-colpito', danno: p.danno })
      continue
    }

    if (p.gittataResidua > 0) vivi.push(p)
  }

  s.proiettili = vivi
}

/** Chi prende questo proiettile, se qualcuno lo prende. */
function colpito(s: Scontro, p: Proiettile): Corpo | null {
  if (p.delGiocatore) {
    return s.nemici.find((n) => vicini(n.pos, p.pos)) ?? null
  }
  return vicini(s.giocatore.pos, p.pos) ? s.giocatore : null
}

function vicini(a: Griglia, b: Griglia): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= RAGGIO_CORPO
}

/**
 * Il conto della fuga.
 *
 * Basta farsi vedere da uno per far ripartire il cronometro da capo: due minuti
 * significa due minuti senza che nessuno ti abbia addosso gli occhi.
 */
function aggiornaFuga(s: Scontro, dt: number) {
  const visto = s.nemici.some(
    (n) =>
      n.tipo !== 'passante' &&
      Math.hypot(n.pos.x - s.giocatore.pos.x, n.pos.y - s.giocatore.pos.y) <=
        DISTANZA_VISTA,
  )

  s.tempoNascosto = visto ? 0 : s.tempoNascosto + dt
}

function concludi(s: Scontro, eventi: Evento[]) {
  for (const nemico of s.nemici) {
    if (nemico.vita > 0) continue
    eventi.push({ tipo: 'nemico-abbattuto', nemico: nemico.tipo })
    if (nemico.tipo === 'passante') eventi.push({ tipo: 'passante-colpito' })
  }
  s.nemici = s.nemici.filter((n) => n.vita > 0)

  if (s.giocatore.vita <= 0) {
    s.giocatore.vita = 0
    s.esito = 'perso'
  } else if (!s.nemici.some((n) => n.tipo !== 'passante')) {
    s.esito = 'vinto'
  } else if (s.evitabile && s.tempoNascosto >= TEMPO_FUGA) {
    s.esito = 'scampato'
  }

  if (s.esito !== 'in-corso') eventi.push({ tipo: 'esito', esito: s.esito })
}

function proiettile(
  s: Scontro,
  da: Griglia,
  verso: Griglia,
  arma: DatiArma,
  delGiocatore: boolean,
): Proiettile {
  return {
    id: s.prossimoId++,
    pos: { ...da },
    vel: { x: verso.x * arma.velocitaProiettile, y: verso.y * arma.velocitaProiettile },
    danno: arma.danno,
    gittataResidua: arma.gittata,
    delGiocatore,
  }
}

/** Il nemico più vicino, passanti esclusi. */
function piuVicino(s: Scontro): Nemico | null {
  let scelto: Nemico | null = null
  let minima = Infinity

  for (const n of s.nemici) {
    if (n.tipo === 'passante') continue
    const d = Math.hypot(n.pos.x - s.giocatore.pos.x, n.pos.y - s.giocatore.pos.y)
    if (d < minima) {
      minima = d
      scelto = n
    }
  }

  return scelto
}

function normalizza(v: Griglia): Griglia {
  const lunghezza = Math.hypot(v.x, v.y)
  return lunghezza === 0 ? { x: 0, y: 0 } : { x: v.x / lunghezza, y: v.y / lunghezza }
}

function ruota(v: Griglia, radianti: number): Griglia {
  const cos = Math.cos(radianti)
  const sin = Math.sin(radianti)
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos }
}

/**
 * Il caso, da 0 a 1.
 *
 * Un generatore lineare minimo: serve solo a far sbagliare i colpi, e avere il
 * seme dentro lo scontro vuol dire che la stessa sparatoria si rigioca uguale.
 */
function caso(s: Scontro): number {
  s.seme = (s.seme * 1_664_525 + 1_013_904_223) % 4_294_967_296
  return s.seme / 4_294_967_296
}

function clona(s: Scontro): Scontro {
  return {
    ...s,
    giocatore: { ...s.giocatore, pos: { ...s.giocatore.pos } },
    nemici: s.nemici.map((n) => ({ ...n, pos: { ...n.pos } })),
    proiettili: s.proiettili.map((p) => ({ ...p, pos: { ...p.pos }, vel: { ...p.vel } })),
  }
}
