import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { mondoDaRighe, QUERY, type Mondo } from '../data/seed'
import { generaCalendario } from './calendario'
import { cambi, giocaGiornata, nuovaCarriera, nuovaStagione, prossimaGiornata, simulaFinoAllaFine, xiDi } from './carriera'
import { classifica } from './classifica'
import { formazione, giocaPartita } from './partita'
import { tipoEvento } from './tipi'

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

  it('tiri e ammonizioni realistici', () => {
    const eventi = finita.calendario.flatMap((p) => p.eventi ?? [])
    const perSquadra = (tipi: string[]) => eventi.filter((e) => tipi.includes(tipoEvento(e))).length / 760
    expect(perSquadra(['gol', 'parata', 'fuori', 'palo'])).toBeGreaterThan(9)
    expect(perSquadra(['gol', 'parata', 'fuori', 'palo'])).toBeLessThan(15)
    expect(perSquadra(['giallo'])).toBeGreaterThan(1.5)
    expect(perSquadra(['giallo'])).toBeLessThan(2.5)
  })

  it('passaggi e possesso realistici', () => {
    const s = finita.calendario.map((p) => p.statistiche!)
    const passaggi = s.reduce((a, x) => a + x.passaggi[0] + x.passaggi[1], 0)
    const riusciti = s.reduce((a, x) => a + x.passaggiRiusciti[0] + x.passaggiRiusciti[1], 0)
    expect(riusciti / passaggi).toBeGreaterThan(0.8)
    expect(riusciti / passaggi).toBeLessThan(0.9)
    expect(Math.min(...s.map((x) => x.possessoCasa))).toBeGreaterThan(25)
    expect(Math.max(...s.map((x) => x.possessoCasa))).toBeLessThan(85)
  })

  it('gli attributi contano: con passaggio e visione migliori si tiene più palla', () => {
    const p = carriera.calendario[0]
    const xiC = xiDi(carriera, p.casaId)
    const xiO = xiDi(carriera, p.ospiteId)
    const migliorati = xiC.map((g) => ({ ...g, attr: { ...g.attr, passaggio: Math.min(20, g.attr.passaggio + 4), visione: Math.min(20, g.attr.visione + 4) } }))
    const media = (xi: typeof xiC) =>
      Array.from({ length: 12 }, (_, i) => giocaPartita(p, xi, xiO, `attr${i}`).statistiche.possessoCasa).reduce((a, b) => a + b, 0) / 12
    expect(media(migliorati)).toBeGreaterThan(media(xiC) + 3)
  })

  it.each([30, 46, 75])('un cambio al minuto %i non altera quanto successo prima', (da) => {
    const p = carriera.calendario.find((x) => x.casaId === '46' || x.ospiteId === '46')!
    const xi = xiDi(carriera, '46')
    const panchina = Object.values(carriera.giocatori).filter((g) => g.clubId === '46' && !xi.includes(g))
    const nuovo = [...xi.slice(0, 8), ...panchina.slice(0, 3)]
    const stessa = (x: typeof p) => x.casaId === p.casaId && x.ospiteId === p.ospiteId
    const base = giocaGiornata(carriera).calendario.find(stessa)!
    const cambiata = giocaGiornata(carriera, [{ da, xi: nuovo }]).calendario.find(stessa)!
    const prima = (q: typeof base) => JSON.stringify(q.eventi!.filter((e) => e.minuto < da))
    expect(prima(cambiata)).toBe(prima(base))
    expect(cambi(xi, [nuovo])).toBe(3)
  })

  it('i cambi contano ogni giocatore entrato una sola volta', () => {
    const xi = xiDi(carriera, '46')
    const panchina = Object.values(carriera.giocatori).filter((g) => g.clubId === '46' && !xi.includes(g))
    const dopo60 = [...xi.slice(0, 10), panchina[0]]
    const dopo75 = [...xi.slice(0, 9), panchina[0], panchina[1]]
    expect(cambi(xi, [dopo60, dopo75])).toBe(2)
  })

  it('stessa carriera, stessi risultati', () => {
    const rifatta = simulaFinoAllaFine(carriera)
    expect(rifatta.calendario.map((p) => `${p.golCasa}-${p.golOspite}`)).toEqual(
      finita.calendario.map((p) => `${p.golCasa}-${p.golOspite}`),
    )
    // Risimula un'intera stagione: serve più dei 5 secondi standard.
  }, 30_000)

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
