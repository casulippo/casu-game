import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { mondoDaRighe, QUERY, type Mondo } from '../data/seed'
import { generaCalendario } from './calendario'
import { nuovaCarriera, nuovaStagione, prossimaGiornata, simulaFinoAllaFine } from './carriera'
import { classifica } from './classifica'
import { formazione } from './partita'

function mondo(): Mondo {
  const db = new DatabaseSync('public/seed.sqlite', { readOnly: true })
  const q = (s: string) => db.prepare(s).all() as Record<string, unknown>[]
  return mondoDaRighe(q(QUERY.meta), q(QUERY.club), q(QUERY.giocatori), q(QUERY.statistiche))
}

describe('calendario', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`)
  const cal = generaCalendario(ids, 'x')

  it('38 giornate da 10 partite, ogni squadra una volta per giornata', () => {
    expect(cal).toHaveLength(380)
    for (let g = 1; g <= 38; g++) {
      const giornata = cal.filter((p) => p.giornata === g)
      expect(giornata).toHaveLength(10)
      expect(new Set(giornata.flatMap((p) => [p.casaId, p.ospiteId])).size).toBe(20)
    }
  })

  it('ogni coppia si affronta una volta in casa e una fuori', () => {
    const coppie = new Set(cal.map((p) => `${p.casaId}>${p.ospiteId}`))
    expect(coppie.size).toBe(380)
  })

  it.each(['x', 'y', 'z', 'serie-a', '2027'])('mai 3 di fila in casa o fuori (seme %s)', (seme) => {
    const cal = generaCalendario(ids, seme)
    for (const id of ids) {
      const sequenza = cal
        .filter((p) => p.casaId === id || p.ospiteId === id)
        .sort((a, b) => a.giornata - b.giornata)
        .map((p) => (p.casaId === id ? 'C' : 'T'))
        .join('')
      expect(sequenza).not.toMatch(/CCC|TTT/)
    }
  })
})

describe('stagione simulata', () => {
  const m = mondo()
  const carriera = nuovaCarriera(m.club, m.giocatori, '46', m.stagione, 'test')
  const finita = simulaFinoAllaFine(carriera)
  const tabella = classifica(m.club.map((c) => c.id), finita.calendario)

  it('formazione di 11 con un portiere', () => {
    const xi = formazione(Object.values(carriera.giocatori).filter((g) => g.clubId === '46'), '4-3-3')
    expect(xi).toHaveLength(11)
    expect(xi.filter((g) => g.ruolo === 'Goalkeeper')).toHaveLength(1)
  })

  it('numeri realistici da Serie A', () => {
    const partite = finita.calendario
    const gol = partite.reduce((s, p) => s + p.golCasa! + p.golOspite!, 0) / partite.length
    expect(prossimaGiornata(finita)).toBeNull()
    expect(gol).toBeGreaterThan(2.2)
    expect(gol).toBeLessThan(3.2)
    expect(tabella[0].punti).toBeGreaterThan(65)
    expect(tabella[0].punti).toBeLessThan(100)
    expect(tabella[19].punti).toBeGreaterThan(10)
  })

  it('stessa carriera, stessi risultati', () => {
    const rifatta = simulaFinoAllaFine(carriera)
    expect(rifatta.calendario.map((p) => `${p.golCasa}-${p.golOspite}`)).toEqual(
      finita.calendario.map((p) => `${p.golCasa}-${p.golOspite}`),
    )
  })

  it('nuova stagione: giovani crescono, anziani calano, statistiche azzerate', () => {
    const dopo = nuovaStagione(finita)
    expect(dopo.stagione).toBe('2027-28')
    expect(dopo.storico).toHaveLength(1)
    const delta = (filtro: (anno: number) => boolean) => {
      const gs = Object.values(finita.giocatori).filter((g) => g.nascita && filtro(Number(g.nascita.slice(0, 4))))
      return gs.reduce((s, g) => s + dopo.giocatori[g.id].overall - g.overall, 0) / gs.length
    }
    expect(delta((a) => a >= 2005)).toBeGreaterThan(0.5)
    expect(delta((a) => a <= 1993)).toBeLessThan(-0.5)
    expect(Object.values(dopo.giocatori).every((g) => g.stagione.presenze === 0)).toBe(true)
  })
})
