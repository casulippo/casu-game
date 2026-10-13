import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { mondoDaRighe, QUERY } from '../../data/seed'
import { nuovaCarriera, xiDi } from '../../engine/carriera'
import { giocaPartita } from '../../engine/partita'
import { creaAnimatore } from './animazione'
import { creaScena, salienteA, type Scena } from './scena'

const db = new DatabaseSync('public/seed.sqlite', { readOnly: true })
const q = (s: string) => db.prepare(s).all() as Record<string, unknown>[]
const m = mondoDaRighe(q(QUERY.meta), q(QUERY.club), q(QUERY.giocatori), q(QUERY.statistiche))
const carriera = nuovaCarriera(m.club, m.giocatori, '46', m.stagione, 'visione')

// Stesso ritmo della schermata live a velocità Normale, con la stessa frenata prima delle azioni.
const RITMO = { gioco: 2.5, azione: 22 }
function ritmoVoluto(scena: Scena, t: number) {
  if (salienteA(scena, t)) return RITMO.azione
  const prossima = scena.salienti.find((s) => s.inizio > t)
  const k = prossima ? Math.min(1, Math.max(0, 1 - (prossima.inizio - t) / 0.5)) : 0
  return RITMO.gioco ** (1 - k) * RITMO.azione ** k
}

// Guarda la partita per qualche minuto reale a 60 fotogrammi al secondo, come i campi 2D e 3D.
function guarda(scena: Scena, secondi: number) {
  const anima = creaAnimatore()
  const dt = 1 / 60
  let t = 0
  let ritmo: number | null = null
  const misure = {
    saltoRitmo: 1,
    campioniInMoto: { azione: 0, veloce: 0 },
    inversioni: { azione: 0, veloce: 0 },
    velocita: { azione: [0, 0], veloce: [0, 0] },
    distanzaPalla: [0, 0, 0],
    // Cambi di squadra del portatore mostrato: distanza dalla palla di chi la prende, e quanto si sposta la palla.
    recuperi: [] as { presa: number; spostamento: number }[],
  }
  let ultimo: { casa: boolean; x: number; y: number } | null = null
  const precedenti = new Map<string, { dx: number; dy: number }>()
  for (let f = 0; f < secondi * 60; f++) {
    const voluto = ritmoVoluto(scena, t)
    const nuovo = ritmo === null ? voluto : Math.exp(Math.log(ritmo) + (Math.log(voluto) - Math.log(ritmo)) * (1 - Math.exp(-dt / 0.4)))
    if (ritmo !== null) misure.saltoRitmo = Math.max(misure.saltoRitmo, nuovo / ritmo, ritmo / nuovo)
    ritmo = nuovo
    t += dt / ritmo
    const { stato, movimenti } = anima(scena, t, dt, f / 60, ritmo)
    const k = stato.saliente ? 'azione' : 'veloce'
    const chi = stato.giocatori.find((g) => g.conPalla)
    if (chi) {
      if (ultimo && chi.casa !== ultimo.casa && !stato.saliente && chi.ruolo !== 'Goalkeeper') {
        misure.recuperi.push({
          presa: Math.hypot(chi.x - stato.palla.x, chi.y - stato.palla.y),
          spostamento: Math.hypot(stato.palla.x - ultimo.x, stato.palla.y - ultimo.y),
        })
      }
      ultimo = { casa: chi.casa, x: stato.palla.x, y: stato.palla.y }
    }
    for (const g of stato.giocatori) {
      if (g.ruolo === 'Goalkeeper') continue
      const mv = movimenti.get(g.id)!
      const v = Math.hypot(mv.dx, mv.dy) / dt
      if (!g.conPalla) {
        misure.velocita[k][0] += v
        misure.velocita[k][1]++
      }
      const prec = precedenti.get(g.id)
      if (prec && v > 1 && Math.hypot(prec.dx, prec.dy) / dt > 1) {
        misure.campioniInMoto[k]++
        if (prec.dx * mv.dx + prec.dy * mv.dy < -0.5 * Math.hypot(prec.dx, prec.dy) * Math.hypot(mv.dx, mv.dy)) misure.inversioni[k]++
      }
      precedenti.set(g.id, mv)
      if (g.conPalla) {
        const d = Math.hypot(g.x - stato.palla.x, g.y - stato.palla.y)
        misure.distanzaPalla[0] += d
        misure.distanzaPalla[1]++
        misure.distanzaPalla[2] = Math.max(misure.distanzaPalla[2], d)
      }
    }
  }
  return misure
}

describe.each(['46', '1005'])('visione della prima giornata (club %s)', (clubId) => {
  const p = carriera.calendario.find((x) => x.giornata === 1 && (x.casaId === clubId || x.ospiteId === clubId))!
  const xiC = xiDi(carriera, p.casaId)
  const xiO = xiDi(carriera, p.ospiteId)
  const scena = creaScena(giocaPartita(p, xiC, xiO, 'visione'), { casa: { base: xiC, fasi: [] }, ospite: { base: xiO, fasi: [] } })
  const misure = guarda(scena, 240)

  it('il ritmo cambia in modo graduale', () => {
    expect(misure.saltoRitmo).toBeLessThan(1.2)
  })

  it('niente vibrazioni: le inversioni di direzione sono rare', () => {
    expect(misure.inversioni.azione / misure.campioniInMoto.azione).toBeLessThan(0.004)
    expect(misure.inversioni.veloce / misure.campioniInMoto.veloce).toBeLessThan(0.004)
  })

  it('nelle azioni i giocatori corrono a velocità umane', () => {
    expect(misure.velocita.azione[0] / misure.velocita.azione[1]).toBeLessThan(8)
    expect(misure.velocita.azione[0] / misure.velocita.azione[1]).toBeGreaterThan(1)
  })

  it("nei recuperi la palla non vola verso l'avversario: la prende chi le è vicino", () => {
    const presa = misure.recuperi.map((r) => r.presa).sort((a, b) => a - b)
    const spostamento = misure.recuperi.map((r) => r.spostamento).sort((a, b) => a - b)
    expect(presa.length).toBeGreaterThan(10)
    expect(presa[Math.floor(presa.length * 0.9)]).toBeLessThan(4)
    expect(spostamento[Math.floor(spostamento.length * 0.9)]).toBeLessThan(3)
  })

  it('la palla resta sui piedi di chi la porta', () => {
    expect(misure.distanzaPalla[0] / misure.distanzaPalla[1]).toBeLessThan(1.5)
  })
})
