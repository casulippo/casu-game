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
    const esatto = statoScena(scena, t)
    const vera = esatto.palla
    riferimento ??= { ...vera }
    riferimento.x = avvicina(riferimento.x, vera.x, dt, 3)
    riferimento.y = avvicina(riferimento.y, vera.y, dt, 3)
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

    // 9 m/s di gioco convertiti in tempo reale nelle azioni; nell'avanti veloce un limite basso, per calma.
    // Mai oltre 30 m/s: quando l'orologio sta ancora frenando, la conversione darebbe valori assurdi.
    const velocitaMax = 14 + (Math.min(30, (9 * 60) / secondiPerMinuto) - 14) * regime
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
      const v = vivacita({ ...g, conPalla }, secondiReali, quotaCasa)
      const obiettivo = { x: limita(x + v.x, 1, LUNGHEZZA - 1), y: limita(y + v.y, 1, LARGHEZZA - 1) }
      const p = posizioni.get(g.id) ?? { ...obiettivo }
      movimenti.set(g.id, insegui(p, obiettivo, dt, velocitaMax))
      posizioni.set(g.id, p)
      return { ...g, x: p.x, y: p.y, conPalla }
    })

    // Palla mostrata: ai piedi di chi la porta quando qualcuno la porta, sul suo percorso quando è in volo.
    const chi = giocatori.find((g) => g.conPalla)
    const voluta: Palla = pallaLibera ? { x: pallaLibera.x, y: pallaLibera.y, h: 0 } : chi ? { x: chi.x + (chi.casa ? 0.9 : -0.9), y: chi.y, h: 0 } : vera
    mostrata ??= { ...voluta }
    const rapidita = regime === 1 ? 40 : 25
    mostrata.x = avvicina(mostrata.x, voluta.x, dt, rapidita)
    mostrata.y = avvicina(mostrata.y, voluta.y, dt, rapidita)
    mostrata.h = avvicina(mostrata.h, voluta.h, dt, rapidita)

    return { stato: { ...esatto, giocatori, portatore, quotaCasa, palla: { ...mostrata } }, movimenti }
  }
}
