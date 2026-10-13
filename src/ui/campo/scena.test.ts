import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { mondoDaRighe, QUERY } from '../../data/seed'
import { giocaGiornata, nuovaCarriera, xiDi } from '../../engine/carriera'
import { possesso } from '../../engine/partita'
import { tipoEvento } from '../../engine/tipi'
import { creaScena, LARGHEZZA, LUNGHEZZA, palla, statoScena } from './scena'

const db = new DatabaseSync('public/seed.sqlite', { readOnly: true })
const q = (s: string) => db.prepare(s).all() as Record<string, unknown>[]
const m = mondoDaRighe(q(QUERY.meta), q(QUERY.club), q(QUERY.giocatori), q(QUERY.statistiche))
const carriera = nuovaCarriera(m.club, m.giocatori, '46', m.stagione, 'scena')

describe.each(['46', '5', '1005'])('scena della prima giornata (club %s)', (clubId) => {
  const c = { ...carriera, clubUtente: clubId }
  const p = giocaGiornata(c).calendario.find((x) => x.giornata === 1 && (x.casaId === clubId || x.ospiteId === clubId))!
  const xiC = xiDi(c, p.casaId)
  const xiO = xiDi(c, p.ospiteId)
  const scena = creaScena(p, { casa: { base: xiC, fasi: [] }, ospite: { base: xiO, fasi: [] } }, possesso(xiC, xiO), 'test')
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

  it('la palla non si teletrasporta', () => {
    let prec = palla(scena, 0)
    for (const t of istanti.slice(1)) {
      const b = palla(scena, t)
      // 0,005 minuti: anche il tiro più veloce percorre pochi metri.
      expect(Math.hypot(b.x - prec.x, b.y - prec.y)).toBeLessThan(6)
      prec = b
    }
  })

  it('ogni gol finisce in rete al minuto giusto', () => {
    const gol = (p.eventi ?? []).filter((x) => tipoEvento(x) === 'gol')
    for (const e of gol) {
      const dopo = scena.segmenti.find((s) => s.evento === e && s.tipo === 'dopo')!
      const b = palla(scena, dopo.inizio + 0.001)
      const casa = e.clubId === p.casaId
      expect(casa ? b.x > LUNGHEZZA : b.x < 0).toBe(true)
      expect(b.y).toBeGreaterThan(30.3)
      expect(b.y).toBeLessThan(37.7)
    }
  })

  it('palla al centro a inizio secondo tempo', () => {
    const b = palla(scena, 45)
    expect(b.x).toBeCloseTo(LUNGHEZZA / 2)
    expect(b.y).toBeCloseTo(LARGHEZZA / 2)
  })
})

it('dopo un cambio al 60° scende in campo il subentrato', () => {
  const p = giocaGiornata(carriera).calendario.find((x) => x.giornata === 1 && (x.casaId === '46' || x.ospiteId === '46'))!
  const xi = xiDi(carriera, '46')
  const panchina = Object.values(carriera.giocatori).filter((g) => g.clubId === '46' && !xi.includes(g))
  const xi2 = [...xi.slice(0, 10), panchina[0]]
  const avversario = xiDi(carriera, p.casaId === '46' ? p.ospiteId : p.casaId)
  const mia = { base: xi, fasi: [{ da: 60, xi: xi2 }] }
  const loro = { base: avversario, fasi: [] }
  const scena = creaScena(p, p.casaId === '46' ? { casa: mia, ospite: loro } : { casa: loro, ospite: mia }, 50, 'test')
  const inCampo = (t: number) => statoScena(scena, t).giocatori.some((g) => g.id === panchina[0].id)
  expect(inCampo(58.9)).toBe(false)
  expect(inCampo(59.1)).toBe(true)
})
