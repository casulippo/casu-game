import { limita } from '../../engine/campo'
import { insegui, LARGHEZZA, LUNGHEZZA, statoScena, vivacita, type Scena, type Stato, type StatoGiocatore } from './scena'

export interface Fotogramma {
  stato: Stato
  // Spostamento di ogni giocatore in questo fotogramma (metri), per orientarli e animare la corsa.
  movimenti: Map<string, { dx: number; dy: number }>
}

type Palla = { x: number; y: number; h: number }

const avvicina = (a: number, b: number, dt: number, rapidita: number) => a + (b - a) * (1 - Math.exp(-Math.max(0, dt) * rapidita))

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
  const posizioni = new Map<string, { x: number; y: number }>()
  let riferimento: Palla | null = null
  let mostrata: Palla | null = null
  let portatoreVeloce: string | null = null
  // 1 = regime azione, 0 = avanti veloce.
  let regime = 1

  const scegliPortatore = (stato: Stato, rif: Palla) => {
    const distanza = (g: StatoGiocatore) => {
      const p = posizioni.get(g.id) ?? g
      return Math.hypot(p.x - rif.x, p.y - rif.y)
    }
    const inPossesso = stato.giocatori.filter((g) => g.ruolo !== 'Goalkeeper' && g.casa === stato.quotaCasa >= 0.5)
    const migliore = inPossesso.reduce((a, g) => (distanza(g) < distanza(a) ? g : a), inPossesso[0])
    const attuale = inPossesso.find((g) => g.id === portatoreVeloce)
    // Isteresi: si cambia portatore solo se il nuovo è almeno 4 metri più vicino alla palla.
    portatoreVeloce = attuale && distanza(attuale) < distanza(migliore) + 4 ? attuale.id : migliore.id
    return portatoreVeloce
  }

  return (scena: Scena, t: number, dt: number, secondiReali: number, secondiPerMinuto: number): Fotogramma => {
    const esatto = statoScena(scena, t)
    const vera = esatto.palla
    riferimento ??= { ...vera }
    riferimento.x = avvicina(riferimento.x, vera.x, dt, 3)
    riferimento.y = avvicina(riferimento.y, vera.y, dt, 3)
    regime = avvicina(regime, esatto.saliente ? 1 : 0, dt, 5)
    if (regime > 0.995) regime = 1
    if (regime < 0.005) regime = 0
    const veloce = regime < 1 ? statoScena(scena, t, riferimento) : null
    const portatoreVisto = veloce ? scegliPortatore(veloce, riferimento) : null
    if (!veloce) portatoreVeloce = null
    const portatore = regime >= 0.5 ? esatto.portatore : portatoreVisto
    const quotaCasa = veloce ? veloce.quotaCasa + (esatto.quotaCasa - veloce.quotaCasa) * regime : esatto.quotaCasa

    // 9 m/s di gioco convertiti in tempo reale nelle azioni; nell'avanti veloce un limite basso, per calma.
    const velocitaMax = 14 + ((9 * 60) / secondiPerMinuto - 14) * regime
    const movimenti = new Map<string, { dx: number; dy: number }>()
    const giocatori = esatto.giocatori.map((g) => {
      let x = g.x
      let y = g.y
      if (veloce) {
        const f = veloce.giocatori.find((v) => v.id === g.id)!
        const fx = f.id === portatoreVisto ? riferimento!.x : f.x
        const fy = f.id === portatoreVisto ? riferimento!.y : f.y
        x = fx + (g.x - fx) * regime
        y = fy + (g.y - fy) * regime
      }
      const conPalla = g.id === portatore
      const v = vivacita({ ...g, conPalla }, secondiReali, quotaCasa)
      const obiettivo = { x: limita(x + v.x, 1, LUNGHEZZA - 1), y: limita(y + v.y, 1, LARGHEZZA - 1) }
      const p = posizioni.get(g.id) ?? { ...obiettivo }
      movimenti.set(g.id, insegui(p, obiettivo, dt, velocitaMax))
      posizioni.set(g.id, p)
      return { ...g, x: p.x, y: p.y, conPalla }
    })

    // Palla mostrata: esatta nelle azioni, sui piedi del portatore nell'avanti veloce.
    const chi = giocatori.find((g) => g.conPalla)
    const aiPiedi: Palla = chi ? { x: chi.x + (chi.casa ? 0.9 : -0.9), y: chi.y, h: 0 } : vera
    const voluta: Palla = {
      x: aiPiedi.x + (vera.x - aiPiedi.x) * regime,
      y: aiPiedi.y + (vera.y - aiPiedi.y) * regime,
      h: vera.h * regime,
    }
    mostrata ??= { ...voluta }
    const rapidita = regime === 1 ? 40 : 25
    mostrata.x = avvicina(mostrata.x, voluta.x, dt, rapidita)
    mostrata.y = avvicina(mostrata.y, voluta.y, dt, rapidita)
    mostrata.h = avvicina(mostrata.h, voluta.h, dt, rapidita)

    return { stato: { ...esatto, giocatori, portatore, quotaCasa, palla: { ...mostrata } }, movimenti }
  }
}
