import { limita } from '../../engine/campo'
import { LARGHEZZA, LUNGHEZZA, salienteA, statoScena, vivacita, type Scena, type Stato, type StatoGiocatore } from './scena'

export interface Fotogramma {
  stato: Stato
  // Spostamento di ogni giocatore in questo fotogramma (metri), per orientarli e animare la corsa.
  movimenti: Map<string, { dx: number; dy: number }>
}

type Palla = { x: number; y: number; h: number }

const avvicina = (a: number, b: number, dt: number, rapidita: number) => a + (b - a) * (1 - Math.exp(-Math.max(0, dt) * rapidita))

interface Corridore {
  x: number
  y: number
  vx: number
  vy: number
}

// Corsa con inerzia senza orbite: molla smorzata in modo critico (come lo "SmoothDamp" dei motori di gioco).
// Il giocatore accelera e frena con naturalezza, raggiunge il punto voluto in circa `tempoRisposta` secondi e
// non lo supera mai: inseguendo un bersaglio che si sposta non gli gira intorno a piccoli cerchi.
export function corri(p: Corridore, obiettivo: { x: number; y: number }, dt: number, velocitaMax: number, tempoRisposta: number) {
  if (!(dt > 0)) return { dx: 0, dy: 0 }
  const omega = 2 / Math.max(0.05, tempoRisposta)
  const x = omega * dt
  const smorza = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  let cx = p.x - obiettivo.x
  let cy = p.y - obiettivo.y
  const massimo = velocitaMax * tempoRisposta
  const lungo = Math.hypot(cx, cy)
  if (lungo > massimo) {
    cx *= massimo / lungo
    cy *= massimo / lungo
  }
  const tx = p.x - cx
  const ty = p.y - cy
  const ax = (p.vx + omega * cx) * dt
  const ay = (p.vy + omega * cy) * dt
  p.vx = (p.vx - omega * ax) * smorza
  p.vy = (p.vy - omega * ay) * smorza
  let nx = tx + (cx + ax) * smorza
  let ny = ty + (cy + ay) * smorza
  // Mai oltre l'obiettivo.
  if ((obiettivo.x - p.x) * (nx - obiettivo.x) + (obiettivo.y - p.y) * (ny - obiettivo.y) > 0) {
    nx = obiettivo.x
    ny = obiettivo.y
    p.vx = 0
    p.vy = 0
  }
  const dx = nx - p.x
  const dy = ny - p.y
  p.x = nx
  p.y = ny
  return { dx, dy }
}

// Velocità massima e tempo di reazione di un calciatore, in metri e secondi di gioco.
const SPRINT = 8.5
const REAZIONE = 0.5
const SOGLIA_POSTO = 4
const SOGLIA_POSTO_AZIONE = 2
// Velocità massima della palla fuori dai voli seguiti tocco per tocco (m/s di gioco, come un lancio lungo).
const PALLA_MAX = 18

// Trasforma lo stato calcolato dalla regia in ciò che si vede, un fotogramma alla volta:
// pedine che corrono verso la loro posizione con velocità credibile, palla attaccata a chi la porta.
// Usato sia dal campo 2D sia dal 3D, così si comportano allo stesso modo.
//
// Due regimi:
// - azione: tutto tocco per tocco, palla esatta, giocatori veloci quanto serve per seguirla;
// - avanti veloce: i tocchi sono troppo fitti per essere seguiti. Le squadre seguono una palla
//   smorzata e il portatore mostrato cambia solo quando un altro è chiaramente più vicino.
// Il passaggio tra i due regimi è graduale: per circa mezzo secondo le posizioni si mescolano.
export function creaAnimatore() {
  const posizioni = new Map<string, Corridore>()
  // Posto scelto da chi non segue la palla: cambia solo quando quello ideale se ne allontana di qualche metro.
  const mete = new Map<string, { x: number; y: number }>()
  let ultimoT: number | null = null
  let voloCorrente: { t0: number; da: { x: number; y: number }; f0: number } | null = null
  let riferimento: Palla | null = null
  let mostrata: Palla | null = null
  let portatoreVeloce: string | null = null
  let pressanteVeloce: string | null = null
  // Palla contesa: dopo un cambio di possesso nell'avanti veloce resta ferma finché il nuovo portatore non la raggiunge.
  let pallaLibera: { x: number; y: number; da: number } | null = null
  let squadraMostrata: boolean | null = null
  // Il possesso mostrato cambia solo se l'altra squadra tiene palla per almeno 0,12 minuti di gioco (~7 secondi):
  // i rimpalli di pochi istanti, invisibili a questa velocità, non fanno saltare la palla avanti e indietro.
  let candidata: { casa: boolean; da: number } | null = null
  // 1 = regime azione, 0 = avanti veloce.
  let regime = 1

  // Nell'avanti veloce il portatore mostrato è della squadra che ha davvero la palla.
  // Tra compagni passa a chi è più vicino alla palla (con isteresi, per non saltare di continuo);
  // quando cambia squadra la prende l'avversario più vicino alla palla mostrata: un contrasto sul posto.
  const scegliPortatore = (stato: Stato, rif: Palla, squadra: boolean) => {
    const dove = (g: StatoGiocatore) => posizioni.get(g.id) ?? g
    const distanza = (g: StatoGiocatore, p: { x: number; y: number }) => Math.hypot(dove(g).x - p.x, dove(g).y - p.y)
    const candidati = stato.giocatori.filter((g) => g.ruolo !== 'Goalkeeper' && g.casa === squadra)
    const attuale = candidati.find((g) => g.id === portatoreVeloce)
    // Chi sta andando a prendere una palla contesa non viene sostituito a metà corsa.
    if (attuale && pallaLibera) return attuale.id
    if (!attuale && mostrata) {
      const palla = mostrata
      portatoreVeloce = candidati.reduce((a, g) => (distanza(g, palla) < distanza(a, palla) ? g : a), candidati[0]).id
      return portatoreVeloce
    }
    const migliore = candidati.reduce((a, g) => (distanza(g, rif) < distanza(a, rif) ? g : a), candidati[0])
    portatoreVeloce = attuale && distanza(attuale, rif) < distanza(migliore, rif) + 4 ? attuale.id : migliore.id
    return portatoreVeloce
  }

  return (scena: Scena, t: number, dt: number, secondiReali: number, secondiPerMinuto: number): Fotogramma => {
    // Salto nel tempo (stacco tra due azioni, "Vai all'intervallo"): si riparte dalle posizioni nuove, senza corse.
    if (ultimoT !== null && Math.abs(t - ultimoT) > 0.3) {
      posizioni.clear()
      mete.clear()
      riferimento = null
      mostrata = null
      voloCorrente = null
      portatoreVeloce = null
      pressanteVeloce = null
      pallaLibera = null
      squadraMostrata = null
      candidata = null
      regime = salienteA(scena, t) ? 1 : 0
    }
    ultimoT = t
    const esatto = statoScena(scena, t)
    const vera = esatto.palla
    // Nell'avanti veloce le squadre seguono una palla di riferimento che scivola piano verso quella vera: se seguissero
    // la palla vera, ogni passaggio sposterebbe di colpo gli obiettivi e i giocatori girerebbero in tondo per inseguirli.
    riferimento ??= { ...vera }
    riferimento.x = avvicina(riferimento.x, vera.x, dt, 0.6)
    riferimento.y = avvicina(riferimento.y, vera.y, dt, 0.6)
    regime = avvicina(regime, esatto.saliente ? 1 : 0, dt, 5)
    if (regime > 0.995) regime = 1
    if (regime < 0.005) regime = 0
    const veloce = regime < 1 ? statoScena(scena, t, riferimento) : null
    if (!candidata || candidata.casa !== esatto.squadraPalla) candidata = { casa: esatto.squadraPalla, da: t }
    const squadraStabile =
      squadraMostrata === null || t - candidata.da >= 0.12 || Math.abs(t - candidata.da) > 5 ? candidata.casa : squadraMostrata
    const portatoreVisto = veloce ? scegliPortatore(veloce, riferimento, squadraStabile) : null
    if (!veloce) portatoreVeloce = null
    // Nell'avanti veloce un avversario sta addosso al portatore mostrato: se la palla cambia squadra,
    // è lui a prenderla, a contatto. Cambia solo se un altro è chiaramente più vicino.
    const pressaQui = portatoreVisto ? posizioni.get(portatoreVisto) : undefined
    let pressante: StatoGiocatore | undefined
    if (veloce && pressaQui) {
      const lontananza = (g: StatoGiocatore) => {
        const p = posizioni.get(g.id) ?? g
        return Math.hypot(p.x - pressaQui.x, p.y - pressaQui.y)
      }
      const avversari = veloce.giocatori.filter((g) => g.casa !== squadraStabile && g.ruolo !== 'Goalkeeper')
      const migliore = avversari.reduce((a, g) => (lontananza(g) < lontananza(a) ? g : a), avversari[0])
      const attuale = avversari.find((g) => g.id === pressanteVeloce)
      pressante = attuale && lontananza(attuale) < lontananza(migliore) + 3 ? attuale : migliore
      pressanteVeloce = pressante.id
    } else pressanteVeloce = null
    if (veloce && portatoreVisto && squadraMostrata !== null && squadraMostrata !== squadraStabile && mostrata) {
      pallaLibera = { x: mostrata.x, y: mostrata.y, da: secondiReali }
    }
    if (veloce) squadraMostrata = squadraStabile
    else {
      squadraMostrata = null
      pallaLibera = null
    }
    if (pallaLibera && portatoreVisto) {
      const p = posizioni.get(portatoreVisto)
      // Raggiunta (o dopo un secondo e mezzo, per sicurezza): il nuovo portatore la controlla.
      if (!p || Math.hypot(p.x - pallaLibera.x, p.y - pallaLibera.y) < 1.5 || secondiReali - pallaLibera.da > 1.5) pallaLibera = null
    }
    const portatore = regime >= 0.5 ? esatto.portatore : pallaLibera ? null : portatoreVisto
    const quotaCasa = veloce ? veloce.quotaCasa + (esatto.quotaCasa - veloce.quotaCasa) * regime : esatto.quotaCasa

    // Nelle azioni velocità massima e tempo di risposta di un calciatore vero, convertiti secondo quanto scorre veloce il
    // tempo (la velocità cresce con la scala, il tempo di risposta cala). Nell'avanti veloce valori fissi, per calma.
    // Tetti di sicurezza per quando l'orologio sta ancora frenando.
    const scala = Math.min(4, 60 / secondiPerMinuto)
    const velocitaMax = 14 + (SPRINT * scala - 14) * regime
    const tempoRisposta = 0.35 + (REAZIONE / scala - 0.35) * regime
    const movimenti = new Map<string, { dx: number; dy: number }>()
    const giocatori = esatto.giocatori.map((g) => {
      let x = g.x
      let y = g.y
      if (veloce) {
        const f = veloce.giocatori.find((v) => v.id === g.id)!
        const versoPalla = f.id === portatoreVisto ? (pallaLibera ?? riferimento!) : null
        let fx = versoPalla ? versoPalla.x : f.x
        let fy = versoPalla ? versoPalla.y : f.y
        if (pressante && f.id === pressante.id && pressaQui) {
          fx += (pressaQui.x + (f.casa ? -1.5 : 1.5) - fx) * 0.85
          fy += (pressaQui.y + 0.5 - fy) * 0.85
        }
        x = fx + (g.x - fx) * regime
        y = fy + (g.y - fy) * regime
      }
      const conPalla = g.id === portatore
      // Chi porta palla, chi va a prenderla e chi pressa seguono la palla: niente movimenti di contorno.
      const libero = !conPalla && g.id !== portatoreVisto && g.id !== pressante?.id
      const v = libero ? vivacita({ ...g, conPalla }, secondiReali, quotaCasa) : { x: 0, y: 0 }
      const ideale = { x: limita(x + v.x, 1, LUNGHEZZA - 1), y: limita(y + v.y, 1, LARGHEZZA - 1) }
      // Chi è libero non insegue ogni piccolo scivolamento del suo posto ideale (girerebbe in tondo): tiene il
      // posto finché quello ideale non se ne allontana, poi ci va dritto.
      const soglia = libero ? SOGLIA_POSTO * (1 - regime) + SOGLIA_POSTO_AZIONE * regime : 0
      const meta = mete.get(g.id)
      const obiettivo = meta && Math.hypot(ideale.x - meta.x, ideale.y - meta.y) < soglia ? meta : ideale
      mete.set(g.id, obiettivo)
      const p = posizioni.get(g.id) ?? { ...obiettivo, vx: 0, vy: 0 }
      movimenti.set(g.id, corri(p, obiettivo, dt, velocitaMax, tempoRisposta))
      posizioni.set(g.id, p)
      return { ...g, x: p.x, y: p.y, conPalla }
    })

    // Palla mostrata.
    // - Nelle azioni, quando è in volo, parte da dove è disegnata e arriva a destinazione nel tempo deciso dal motore:
    //   niente rincorse della traiettoria vera, quindi niente scatti all'inizio di passaggi e tiri.
    // - Altrimenti va ai piedi di chi la porta (o resta contesa), con una velocità massima per non schizzare.
    const chi = giocatori.find((g) => g.conPalla)
    const volo = regime >= 0.5 ? esatto.volo : null
    if (volo && mostrata) {
      const avanzamento = limita((t - volo.t0) / Math.max(0.0001, volo.t1 - volo.t0), 0, 1)
      // Se si comincia a seguire un volo già partito, lo si completa da dove è la palla, nel tempo che resta.
      if (!voloCorrente || voloCorrente.t0 !== volo.t0) voloCorrente = { t0: volo.t0, da: { x: mostrata.x, y: mostrata.y }, f0: avanzamento }
      const f = voloCorrente.f0 >= 1 ? 1 : limita((avanzamento - voloCorrente.f0) / (1 - voloCorrente.f0), 0, 1)
      // Un passaggio arriva ai piedi di chi lo riceve (o di chi lo intercetta), anche se sta ancora correndo.
      const ricevente = volo.riceventeId ? giocatori.find((g) => g.id === volo.riceventeId) : undefined
      const arrivo = ricevente ? { x: ricevente.x + (ricevente.casa ? 0.9 : -0.9), y: ricevente.y } : volo.a
      // Mai più veloce del tocco del motore (con un margine): se il volo è stato preso a metà e la palla
      // è lontana, arriva un po' in ritardo invece di schizzare.
      const vx = voloCorrente.da.x + (arrivo.x - voloCorrente.da.x) * f
      const vy = voloCorrente.da.y + (arrivo.y - voloCorrente.da.y) * f
      const passoVolo = (1.3 * (volo.metri / Math.max(0.1, volo.secondi)) * 60) / secondiPerMinuto * Math.max(0, dt)
      const passo = Math.hypot(vx - mostrata.x, vy - mostrata.y)
      const k = passo > passoVolo ? passoVolo / passo : 1
      mostrata.x += (vx - mostrata.x) * k
      mostrata.y += (vy - mostrata.y) * k
      mostrata.h = 4 * volo.alta * f * (1 - f)
    } else {
      voloCorrente = null
      const voluta: Palla = pallaLibera ? { x: pallaLibera.x, y: pallaLibera.y, h: 0 } : chi ? { x: chi.x + (chi.casa ? 0.9 : -0.9), y: chi.y, h: 0 } : vera
      mostrata ??= { ...voluta }
      const nx = avvicina(mostrata.x, voluta.x, dt, 25)
      const ny = avvicina(mostrata.y, voluta.y, dt, 25)
      // Al massimo quanto un lancio lungo nel tempo che scorre in questo momento.
      // Nell'avanti veloce poco più veloce dei giocatori (14 m/s): la palla si sposta, non schizza.
      const passoMax = Math.max(0.5, Math.min(22, (PALLA_MAX * 60) / secondiPerMinuto)) * Math.max(0, dt)
      const passo = Math.hypot(nx - mostrata.x, ny - mostrata.y)
      const k = passo > passoMax ? passoMax / passo : 1
      mostrata.x += (nx - mostrata.x) * k
      mostrata.y += (ny - mostrata.y) * k
      mostrata.h = avvicina(mostrata.h, voluta.h, dt, 25)
    }

    // Palla ancora in viaggio verso chi la riceverà: nessuno ha l'anello finché non gli arriva ai piedi.
    const inViaggio = chi && Math.hypot(chi.x + (chi.casa ? 0.9 : -0.9) - mostrata!.x, chi.y - mostrata!.y) > 2.5
    const visti = inViaggio ? giocatori.map((g) => ({ ...g, conPalla: false })) : giocatori
    return { stato: { ...esatto, giocatori: visti, portatore: inViaggio ? null : portatore, quotaCasa, palla: { ...mostrata! } }, movimenti }
  }
}

// Diagnostica: se la pagina definisce window.__casuDebug, riceve ogni fotogramma. Nel gioco normale non fa nulla.
type Debug = (f: Fotogramma, t: number, secondiPerMinuto: number, vista: '2d' | '3d') => void
export const debugFotogramma = (f: Fotogramma, t: number, secondiPerMinuto: number, vista: '2d' | '3d') =>
  (globalThis as { __casuDebug?: Debug }).__casuDebug?.(f, t, secondiPerMinuto, vista)
