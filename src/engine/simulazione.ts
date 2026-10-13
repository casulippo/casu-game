import { CENTRO, disponi, distanza, forma, LARGHEZZA, limita, LUNGHEZZA, nelVerso, PALO_ALTO, PALO_BASSO, type Posto, type Punto } from './campo'
import { rng, type Rng } from './rng'
import type { Evento, Giocatore, Partita } from './tipi'

// Formazione in campo a partire dal minuto `da` (incluso), dopo cambi o variazioni di modulo.
export interface Fase {
  da: number
  xi: Giocatore[]
}

export const xiAlMinuto = (base: Giocatore[], fasi: Fase[], m: number) =>
  fasi.filter((f) => f.da <= m).sort((a, b) => a.da - b.da).at(-1)?.xi ?? base

export type TipoTocco = 'passaggio' | 'conduzione' | 'cross' | 'tiro' | 'rinvio'
export type EsitoTocco = 'ok' | 'perso' | 'fallo' | 'gol' | 'parata' | 'fuori' | 'palo' | 'respinto'

// Un'azione con la palla: parte in t0 da `da`, arriva in t1 ad `a`. Tempo in minuti di gioco.
export interface Tocco {
  t0: number
  t1: number
  tipo: TipoTocco
  esito: EsitoTocco
  casa: boolean
  giocatoreId: string
  // Chi ha la palla quando il tocco finisce (compagno, avversario che recupera o portiere).
  riceventeId: string | null
  da: Punto
  a: Punto
  alta: number
  // Numero del possesso: cresce a ogni cambio di squadra in possesso.
  possesso: number
}

export interface Statistiche {
  possessoCasa: number
  passaggi: [number, number]
  passaggiRiusciti: [number, number]
  tiri: [number, number]
  specchio: [number, number]
}

export interface Simulazione {
  eventi: Evento[]
  tocchi: Tocco[]
  statistiche: Statistiche
}

const SECONDI = 1 / 60
const VANTAGGIO_CASA = 0.04

const attr = (g: Giocatore, a: keyof Giocatore['attr']) => g.attr[a]

function sigmoide(x: number) {
  return 1 / (1 + Math.exp(-x))
}

export function simulaPartita(
  p: Partita,
  xiCasa: Giocatore[],
  xiOspite: Giocatore[],
  seme: string,
  fasi: { casa?: Fase[]; ospite?: Fase[] } = {},
): Simulazione {
  const chiave = `partita:${seme}:${p.giornata}:${p.casaId}:${p.ospiteId}`
  // Un generatore per minuto: decisioni prese nel minuto m usano solo il generatore m,
  // così un cambio dal minuto m in poi non tocca nulla di quanto successo prima.
  const generatori = new Map<number, Rng>()
  const caso = (t: number) => {
    const m = Math.min(90, Math.floor(t) + 1)
    let r = generatori.get(m)
    if (!r) {
      r = rng(`${chiave}:${m}`)
      generatori.set(m, r)
    }
    return r()
  }

  type InCampo = { giocatori: Map<string, Giocatore>; posti: Posto[] }
  const perFormazione = new Map<string, InCampo>()
  const perMinuto = new Map<number, InCampo>()
  const inCampo = (t: number): InCampo => {
    const m = Math.min(90, Math.floor(t) + 1)
    let v = perMinuto.get(m)
    if (v) return v
    const c = xiAlMinuto(xiCasa, fasi.casa ?? [], m)
    const o = xiAlMinuto(xiOspite, fasi.ospite ?? [], m)
    const k = [...c, ...o].map((g) => g.id).join(',')
    v = perFormazione.get(k)
    if (!v) {
      v = { giocatori: new Map([...c, ...o].map((g) => [g.id, g])), posti: [...disponi(c, true), ...disponi(o, false)] }
      perFormazione.set(k, v)
    }
    perMinuto.set(m, v)
    return v
  }

  const eventi: Evento[] = []
  const tocchi: Tocco[] = []
  const stat: Statistiche = { possessoCasa: 0, passaggi: [0, 0], passaggiRiusciti: [0, 0], tiri: [0, 0], specchio: [0, 0] }
  const tempoPossesso = [0, 0]

  let t = 0
  let casa = true
  let palla: Punto = { ...CENTRO }
  let portatore = ''
  let possesso = 0
  let ultimoPassatore: string | null = null
  let secondoTempo = false

  const calcioDInizio = (chi: boolean, quando: number) => {
    t = quando
    casa = chi
    palla = { ...CENTRO }
    const { posti } = inCampo(t)
    portatore = posti.filter((q) => q.casa === chi && q.ruolo === 'Midfield').sort((a, b) => a.numero - b.numero)[0]?.id ?? posti.find((q) => q.casa === chi)!.id
    possesso++
    ultimoPassatore = null
  }
  calcioDInizio(true, 0)

  const cambiaPossesso = (nuovo: string, dove: Punto) => {
    casa = !casa
    portatore = nuovo
    palla = dove
    possesso++
    ultimoPassatore = null
  }

  const registra = (tocco: Omit<Tocco, 'casa' | 'possesso'>) => {
    tocchi.push({ ...tocco, casa, possesso })
    tempoPossesso[casa ? 0 : 1] += tocco.t1 - tocco.t0
  }

  const evento = (e: Omit<Evento, 'minuto'> & { t: number }) => {
    eventi.push({ ...e, minuto: Math.min(e.t < 45 ? 45 : 90, Math.floor(e.t) + 1) })
  }

  while (t < 90) {
    if (!secondoTempo && t >= 45) {
      secondoTempo = true
      calcioDInizio(false, 45)
    }
    const fineTempo = secondoTempo ? 90 : 45
    const { giocatori, posti } = inCampo(t)
    if (!giocatori.has(portatore)) {
      // Il portatore è stato sostituito: la palla passa al compagno più vicino.
      const pos = forma(posti, palla, casa)
      portatore = posti
        .filter((q) => q.casa === casa && q.ruolo !== 'Goalkeeper')
        .sort((a, b) => distanza(pos.get(a.id)!, palla) - distanza(pos.get(b.id)!, palla))[0].id
    }
    const pos = forma(posti, palla, casa)
    pos.set(portatore, palla)
    const io = giocatori.get(portatore)!
    const compagni = posti.filter((q) => q.casa === casa && q.id !== portatore)
    const avversari = posti.filter((q) => q.casa !== casa)
    const portiereAvv = avversari.find((q) => q.ruolo === 'Goalkeeper') ?? avversari[0]
    const vicino = piuVicino(avversari, pos, palla, (q) => q.ruolo !== 'Goalkeeper')
    const distPressione = distanza(pos.get(vicino.id)!, palla)
    const pressione = limita(1 - distPressione / 9, 0, 1)
    const b = nelVerso(palla, casa)
    const distPorta = Math.hypot(LUNGHEZZA - b.x, CENTRO.y - b.y)
    const laterale = Math.abs(b.y - CENTRO.y)
    const bonus = casa ? VANTAGGIO_CASA : 0

    // Tempo per controllare e decidere: meno spazio, meno tempo.
    t += (1 + caso(t) * 2.5) * (1 - 0.5 * pressione) * SECONDI
    if (t >= fineTempo) {
      t = fineTempo
      continue
    }

    const pesoTiro =
      distPorta < 32 && io.ruolo !== 'Goalkeeper'
        ? Math.exp(-distPorta / 9) * 14 * (0.6 + attr(io, 'tiro') / 25) * (laterale < 20 ? 1 : 0.35)
        : 0
    const pesoCross = b.x > 72 && laterale > 17 ? 0.9 * (0.6 + attr(io, 'passaggio') / 25) : 0
    const spazio = limita(distPressione / 8, 0.2, 1.5)
    const pesoConduzione = io.ruolo === 'Goalkeeper' ? 0 : 0.55 * spazio * (0.5 + (attr(io, 'dribbling') + attr(io, 'velocita')) / 40)
    const pesoPassaggio = 2.2
    const pesoRinvio = io.ruolo === 'Goalkeeper' || (b.x < 30 && pressione > 0.6) ? 0.7 : 0
    const opzioni: [string, number][] = [
      ['tiro', pesoTiro],
      ['cross', pesoCross],
      ['conduzione', pesoConduzione],
      ['passaggio', pesoPassaggio],
      ['rinvio', pesoRinvio],
    ]
    const totale = opzioni.reduce((s, [, w]) => s + w, 0)
    let x = caso(t) * totale
    let azione = 'passaggio'
    for (const [nome, w] of opzioni) {
      x -= w
      if (x <= 0) {
        azione = nome
        break
      }
    }

    const recupero = (dove: Punto, durata: number, tipo: Tocco['tipo'], esito: Tocco['esito'], alta = 0) => {
      // Il pallone va all'avversario più vicino al punto in cui viene perso.
      const chi = piuVicino(avversari, pos, dove, (q) => q.ruolo !== 'Goalkeeper' || nelVerso(dove, !casa).x < 16)
      registra({ t0: t, t1: t + durata, tipo, esito, giocatoreId: portatore, riceventeId: chi.id, da: palla, a: dove, alta })
      t += durata
      cambiaPossesso(chi.id, dove)
    }

    if (azione === 'passaggio' || azione === 'rinvio') {
      const lungo = azione === 'rinvio'
      const opzioniPassaggio = compagni
        .filter((q) => q.ruolo !== 'Goalkeeper' || b.x < 35)
        .map((q) => {
          const dove = pos.get(q.id)!
          const d = distanza(dove, palla)
          const guadagno = nelVerso(dove, casa).x - b.x
          let marcatura = Infinity
          for (const a of avversari) marcatura = Math.min(marcatura, distanza(pos.get(a.id)!, dove))
          const libero = limita(marcatura / 6, 0.15, 1.2)
          const peso = lungo
            ? (d > 25 ? 1 : 0.1) * Math.exp(guadagno / 20) * libero
            : (d < 38 ? 1 : 0.05) * Math.exp(guadagno / 16) * libero * (d < 4 ? 0.2 : 1)
          return { q, dove, d, libero, peso }
        })
      let r = caso(t) * opzioniPassaggio.reduce((s, o) => s + o.peso, 0)
      let scelto = opzioniPassaggio[0]
      for (const o of opzioniPassaggio) {
        r -= o.peso
        if (r <= 0) {
          scelto = o
          break
        }
      }
      const tecnica = (attr(io, 'passaggio') + attr(io, 'visione') * 0.5) / 15
      // La qualità tecnica pesa più del fattore campo: è lei a decidere chi tiene palla.
      const riuscita = limita(
        0.945 - scelto.d * (lungo ? 0.009 : 0.005) - 0.22 * pressione * (1.3 - tecnica * 0.6) - 0.22 * (1 - Math.min(1, scelto.libero)) + (tecnica - 1) * 0.2 + bonus * 0.4,
        0.25,
        0.98,
      )
      const alta = scelto.d > 28 || lungo ? 2 + scelto.d / 15 : 0
      const durata = (scelto.d / (lungo ? 20 : 15)) * SECONDI
      stat.passaggi[casa ? 0 : 1]++
      if (caso(t) < riuscita) {
        stat.passaggiRiusciti[casa ? 0 : 1]++
        registra({ t0: t, t1: t + durata, tipo: azione, esito: 'ok', giocatoreId: portatore, riceventeId: scelto.q.id, da: palla, a: scelto.dove, alta })
        t += durata
        ultimoPassatore = portatore
        portatore = scelto.q.id
        palla = scelto.dove
      } else {
        const f = 0.5 + caso(t) * 0.45
        const dove = { x: palla.x + (scelto.dove.x - palla.x) * f, y: palla.y + (scelto.dove.y - palla.y) * f }
        recupero(dove, durata * f, azione, 'perso', alta)
      }
      continue
    }

    if (azione === 'conduzione') {
      const passo = 5 + caso(t) * 9
      const versoCentro = (CENTRO.y - b.y) * (b.x > 70 ? 0.25 : 0.08)
      const arrivo = nelVerso({ x: limita(b.x + passo, 1, LUNGHEZZA - 3), y: limita(b.y + versoCentro + (caso(t) - 0.5) * 6, 2, LARGHEZZA - 2) }, casa)
      const durata = (passo / 6.5) * SECONDI
      const sfidante = giocatori.get(vicino.id)!
      const duello = (attr(io, 'dribbling') + attr(io, 'velocita') + attr(io, 'tecnica')) / 3 - (attr(sfidante, 'contrasto') + attr(sfidante, 'marcatura') + attr(sfidante, 'posizionamento')) / 3
      const riuscita = pressione < 0.15 ? 0.97 : limita(sigmoide(0.9 + duello * 0.22 - pressione * 1.3) + bonus, 0.2, 0.95)
      if (caso(t) < riuscita) {
        registra({ t0: t, t1: t + durata, tipo: 'conduzione', esito: 'ok', giocatoreId: portatore, riceventeId: portatore, da: palla, a: arrivo, alta: 0 })
        t += durata
        palla = arrivo
      } else if (caso(t) < 0.32) {
        // Fallo: punizione, il possesso resta. Un fallo su tre costa il giallo.
        registra({ t0: t, t1: t + durata * 0.5, tipo: 'conduzione', esito: 'fallo', giocatoreId: portatore, riceventeId: portatore, da: palla, a: palla, alta: 0 })
        if (caso(t) < 0.42) evento({ t, clubId: casa ? p.ospiteId : p.casaId, tipo: 'giallo', marcatoreId: sfidante.id, assistId: null })
        t += durata * 0.5 + 0.3
      } else {
        // Palla persa lungo il percorso: la prende l'avversario più vicino a quel punto.
        const f = 0.3 + caso(t) * 0.4
        recupero({ x: palla.x + (arrivo.x - palla.x) * f, y: palla.y + (arrivo.y - palla.y) * f }, durata * f, 'conduzione', 'perso')
      }
      continue
    }

    // Tiro, di piede o di testa dopo un cross.
    let tiratore = io
    let partenza = palla
    let diTesta = false
    let assist = ultimoPassatore
    if (azione === 'cross') {
      const inArea = compagni.filter((q) => q.ruolo !== 'Goalkeeper' && nelVerso(pos.get(q.id)!, casa).x > 78)
      const bersaglio = sceltaDaCaso(caso(t), inArea.length ? inArea : compagni, (q) => attr(giocatori.get(q.id)!, 'colpo_di_testa') ** 2 + 20)
      const punto = nelVerso({ x: 92 + caso(t) * 7, y: CENTRO.y + (caso(t) - 0.5) * 14 }, casa)
      const durata = (distanza(palla, punto) / 18) * SECONDI
      const avversarioInArea = avversari
        .filter((q) => q.ruolo !== 'Goalkeeper')
        .sort((a, b2) => distanza(pos.get(a.id)!, punto) - distanza(pos.get(b2.id)!, punto))[0]
      const mio = giocatori.get(bersaglio.id)!
      const loro = giocatori.get(avversarioInArea.id)!
      const precisione = limita(0.45 + (attr(io, 'passaggio') - 11) * 0.025 - pressione * 0.15, 0.2, 0.75)
      const aereo = sigmoide((attr(mio, 'colpo_di_testa') + attr(mio, 'forza') - attr(loro, 'colpo_di_testa') - attr(loro, 'forza')) * 0.12 - 0.2)
      if (caso(t) < precisione * aereo) {
        registra({ t0: t, t1: t + durata, tipo: 'cross', esito: 'ok', giocatoreId: portatore, riceventeId: mio.id, da: palla, a: punto, alta: 4 })
        t += durata
        assist = portatore
        tiratore = mio
        partenza = punto
        diTesta = true
        palla = punto
        portatore = mio.id
      } else {
        recupero(punto, durata, 'cross', 'perso', 4)
        continue
      }
    }

    const tb = nelVerso(partenza, casa)
    const d = Math.hypot(LUNGHEZZA - tb.x, CENTRO.y - tb.y)
    const angolo = limita(1 - (Math.abs(tb.y - CENTRO.y) / (d + 1)) * 0.9, 0.2, 1)
    const abilita = d < 18 ? attr(tiratore, diTesta ? 'colpo_di_testa' : 'finalizzazione') : attr(tiratore, 'tiro')
    const portiere = giocatori.get(portiereAvv.id)!
    const parate = (attr(portiere, 'riflessi') + attr(portiere, 'presa') + attr(portiere, 'posizionamento')) / 3
    const xg = limita(
      1.95 * Math.exp(-0.135 * d) * angolo * (diTesta ? 0.65 : 1) * (abilita / 12) ** 1.3 * (1 - 0.35 * pressione) * (1.18 - 0.025 * (parate - 10)) * (1 + bonus * 4.5),
      0.01,
      0.75,
    )
    stat.tiri[casa ? 0 : 1]++
    // Tiro a circa 24 m/s sul percorso reale, fino al punto in cui finisce la palla.
    const durataVerso = (dove: Punto) => (distanza(partenza, dove) / 24) * SECONDI
    const clubId = casa ? p.casaId : p.ospiteId
    const xPorta = casa ? LUNGHEZZA : 0
    const r = caso(t)
    if (r < xg) {
      stat.specchio[casa ? 0 : 1]++
      const dove = { x: xPorta + (casa ? 1 : -1), y: PALO_ALTO + 1 + caso(t) * 5.3 }
      const durataTiro = durataVerso(dove)
      registra({ t0: t, t1: t + durataTiro, tipo: 'tiro', esito: 'gol', giocatoreId: tiratore.id, riceventeId: null, da: partenza, a: dove, alta: 0.6 + caso(t) * 1.4 })
      evento({ t: t + durataTiro, clubId, tipo: 'gol', marcatoreId: tiratore.id, assistId: assist && assist !== tiratore.id ? assist : null })
      calcioDInizio(!casa, t + durataTiro + 0.9)
      continue
    }
    const nelloSpecchio = caso(t) < limita(0.25 + (abilita - 10) * 0.02, 0.15, 0.45)
    if (nelloSpecchio) {
      stat.specchio[casa ? 0 : 1]++
      const dove = { x: xPorta + (casa ? -1.2 : 1.2), y: CENTRO.y + (caso(t) - 0.5) * 5 }
      const durataTiro = durataVerso(dove)
      registra({ t0: t, t1: t + durataTiro, tipo: 'tiro', esito: 'parata', giocatoreId: tiratore.id, riceventeId: portiere.id, da: partenza, a: dove, alta: 0.8 })
      evento({ t: t + durataTiro, clubId, tipo: 'parata', marcatoreId: tiratore.id, assistId: null, portiereId: portiere.id })
      t += durataTiro + 0.15
      cambiaPossesso(portiere.id, dove)
      continue
    }
    const palo = caso(t) < 0.09
    const y = palo ? (caso(t) < 0.5 ? PALO_ALTO : PALO_BASSO) : caso(t) < 0.5 ? PALO_ALTO - 1 - caso(t) * 6 : PALO_BASSO + 1 + caso(t) * 6
    const dove = { x: xPorta + (palo ? 0 : casa ? 2 : -2), y }
    const durataTiro = durataVerso(dove)
    registra({ t0: t, t1: t + durataTiro, tipo: 'tiro', esito: palo ? 'palo' : 'fuori', giocatoreId: tiratore.id, riceventeId: palo ? null : portiere.id, da: partenza, a: dove, alta: palo ? 0.8 : 1.2 })
    evento({ t: t + durataTiro, clubId, tipo: palo ? 'palo' : 'fuori', marcatoreId: tiratore.id, assistId: null })
    t += durataTiro
    if (palo) {
      // Respinta del palo: la palla rimbalza al limite dell'area e la prende il più vicino.
      const rimbalzo = nelVerso({ x: 92 - caso(t) * 6, y: CENTRO.y + (caso(t) - 0.5) * 20 }, casa)
      const tutti = posti.filter((q) => q.ruolo !== 'Goalkeeper')
      const chi = tutti.sort((a, b2) => distanza(pos.get(a.id)!, rimbalzo) - distanza(pos.get(b2.id)!, rimbalzo))[0]
      registra({ t0: t, t1: t + 0.04, tipo: 'tiro', esito: 'respinto', giocatoreId: tiratore.id, riceventeId: chi.id, da: dove, a: rimbalzo, alta: 1 })
      t += 0.04
      if (chi.casa === casa) {
        portatore = chi.id
        palla = rimbalzo
        ultimoPassatore = null
      } else cambiaPossesso(chi.id, rimbalzo)
    } else {
      // Rimessa dal fondo.
      t += 0.35
      cambiaPossesso(portiere.id, nelVerso({ x: 5, y: CENTRO.y }, !casa))
    }
  }

  const totale = tempoPossesso[0] + tempoPossesso[1] || 1
  stat.possessoCasa = Math.round((tempoPossesso[0] / totale) * 100)
  eventi.sort((a, b) => (a.t ?? a.minuto) - (b.t ?? b.minuto))
  return { eventi, tocchi, statistiche: stat }
}

function piuVicino(lista: Posto[], pos: Map<string, Punto>, punto: Punto, ammesso: (q: Posto) => boolean): Posto {
  let migliore = lista[0]
  let d = Infinity
  for (const q of lista) {
    if (!ammesso(q)) continue
    const dq = distanza(pos.get(q.id)!, punto)
    if (dq < d) {
      d = dq
      migliore = q
    }
  }
  return migliore
}

function sceltaDaCaso<T>(x: number, elementi: T[], peso: (e: T) => number): T {
  const pesi = elementi.map(peso)
  let r = x * pesi.reduce((a, b) => a + b, 0)
  for (let i = 0; i < elementi.length; i++) {
    r -= pesi[i]
    if (r <= 0) return elementi[i]
  }
  return elementi[elementi.length - 1]
}
