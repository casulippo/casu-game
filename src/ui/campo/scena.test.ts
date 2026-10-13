import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { mondoDaRighe, QUERY } from '../../data/seed'
import { nuovaCarriera, xiDi } from '../../engine/carriera'
import { giocaPartita } from '../../engine/partita'
import type { Giocatore } from '../../engine/tipi'
import { creaScena, insegui, LARGHEZZA, LUNGHEZZA, palla, salienteA, statoScena } from './scena'

const db = new DatabaseSync('public/seed.sqlite', { readOnly: true })
const q = (s: string) => db.prepare(s).all() as Record<string, unknown>[]
const m = mondoDaRighe(q(QUERY.meta), q(QUERY.club), q(QUERY.giocatori), q(QUERY.statistiche))
const carriera = nuovaCarriera(m.club, m.giocatori, '46', m.stagione, 'scena')
const seme = `${carriera.seme}:${carriera.stagione}`

describe.each(['46', '5', '1005'])('scena della prima giornata (club %s)', (clubId) => {
  const p = carriera.calendario.find((x) => x.giornata === 1 && (x.casaId === clubId || x.ospiteId === clubId))!
  const xiC = xiDi(carriera, p.casaId)
  const xiO = xiDi(carriera, p.ospiteId)
  const sim = giocaPartita(p, xiC, xiO, seme)
  const scena = creaScena(sim, { casa: { base: xiC, fasi: [] }, ospite: { base: xiO, fasi: [] } })
  const istanti = Array.from({ length: 18001 }, (_, i) => i * 0.005)

  it('22 giocatori sempre dentro il campo', () => {
    for (const t of istanti.filter((_, i) => i % 50 === 0)) {
      const s = statoScena(scena, t)
      expect(s.giocatori).toHaveLength(22)
      for (const g of s.giocatori) {
        expect(g.x).toBeGreaterThanOrEqual(0)
        expect(g.x).toBeLessThanOrEqual(LUNGHEZZA)
        expect(g.y).toBeGreaterThanOrEqual(0)
        expect(g.y).toBeLessThanOrEqual(LARGHEZZA)
      }
    }
  })

  it('ogni squadra difende la propria porta', () => {
    for (const t of istanti.filter((_, i) => i % 40 === 0)) {
      const s = statoScena(scena, t)
      const portiere = (casa: boolean) => s.giocatori.find((g) => g.casa === casa && g.ruolo === 'Goalkeeper')!
      expect(portiere(true).x).toBeLessThan(25)
      expect(portiere(false).x).toBeGreaterThan(LUNGHEZZA - 25)
      for (const casa of [true, false]) {
        const media = (ruolo: string) => {
          const gs = s.giocatori.filter((g) => g.casa === casa && g.ruolo === ruolo)
          const x = gs.reduce((a, g) => a + g.x, 0) / gs.length
          return casa ? x : LUNGHEZZA - x
        }
        expect(media('Defender')).toBeLessThan(media('Attack'))
      }
    }
  })

  it('la palla non si teletrasporta', () => {
    let prec = palla(scena, 0)
    for (const t of istanti.slice(1)) {
      const b = palla(scena, t)
      // 0,005 minuti sono 0,3 secondi: anche un tiro forte (~30 m/s) percorre meno di 10 metri.
      if (Math.abs(t - 45) > 0.2) expect(Math.hypot(b.x - prec.x, b.y - prec.y)).toBeLessThan(10)
      prec = b
    }
  })

  it('ogni gol finisce in rete quando lo dice il motore', () => {
    const gol = sim.tocchi.filter((x) => x.esito === 'gol')
    expect(gol).toHaveLength(sim.eventi.filter((e) => e.tipo === 'gol').length)
    for (const tiro of gol) {
      const b = palla(scena, tiro.t1)
      expect(tiro.casa ? b.x > LUNGHEZZA : b.x < 0).toBe(true)
      expect(b.y).toBeGreaterThan(30.3)
      expect(b.y).toBeLessThan(37.7)
    }
  })

  it('ogni tiro cade dentro una sequenza da seguire al rallentatore', () => {
    for (const tiro of sim.tocchi.filter((x) => x.tipo === 'tiro' && x.esito !== 'respinto')) {
      expect(salienteA(scena, tiro.t0)).toBeDefined()
    }
  })

  it('palla al centro a inizio secondo tempo', () => {
    const b = palla(scena, 45)
    expect(b.x).toBeCloseTo(LUNGHEZZA / 2)
    expect(b.y).toBeCloseTo(LARGHEZZA / 2)
  })
})

it.each([-0.004, 0, 0.016])('insegui non produce NaN (dt %f, pedina già in posizione)', (dt) => {
  const p = { x: 10, y: 20 }
  insegui(p, { x: 10, y: 20 }, dt, true)
  insegui(p, { x: 30, y: 20 }, dt, false)
  expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
})

it('dopo un cambio al 60° scende in campo il subentrato, e il motore lo usa', () => {
  const p = carriera.calendario.find((x) => x.giornata === 1 && (x.casaId === '46' || x.ospiteId === '46'))!
  const xi = xiDi(carriera, '46')
  const panchina = Object.values(carriera.giocatori).filter((g) => g.clubId === '46' && !xi.includes(g))
  const entra = panchina.find((g) => g.ruolo === 'Midfield')!
  const xi2: Giocatore[] = [...xi.filter((g) => g.ruolo !== 'Midfield' || g === xi.find((x) => x.ruolo === 'Midfield')).slice(0, 10), entra]
  const avversario = xiDi(carriera, p.casaId === '46' ? p.ospiteId : p.casaId)
  const inCasa = p.casaId === '46'
  const fasi = [{ da: 60, xi: xi2 }]
  const sim = giocaPartita(p, inCasa ? xi : avversario, inCasa ? avversario : xi, seme, inCasa ? { casa: fasi } : { ospite: fasi })
  const mia = { base: xi, fasi }
  const loro = { base: avversario, fasi: [] }
  const scena = creaScena(sim, inCasa ? { casa: mia, ospite: loro } : { casa: loro, ospite: mia })
  const inCampo = (t: number) => statoScena(scena, t).giocatori.some((g) => g.id === entra.id)
  expect(inCampo(58.9)).toBe(false)
  expect(inCampo(59.1)).toBe(true)
  expect(sim.tocchi.some((x) => x.giocatoreId === entra.id && x.t0 >= 59)).toBe(true)
  expect(sim.tocchi.some((x) => x.giocatoreId === entra.id && x.t0 < 59)).toBe(false)
})
