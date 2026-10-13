import { DatabaseSync } from 'node:sqlite'
import { expect, it } from 'vitest'
import { mondoDaRighe, QUERY } from '../../data/seed'
import { nuovaCarriera, xiDi } from '../../engine/carriera'
import { giocaPartita } from '../../engine/partita'
import { creaScena, insegui, salienteA, smorzaPalla, statoScena, vivacita } from './scena'
// Simula 3 minuti reali di visione a 60 fotogrammi al secondo, come fanno i campi 2D e 3D.
it('giocatori sempre in movimento, a velocità credibili, e ritmo senza strappi', () => {
  const db = new DatabaseSync('public/seed.sqlite', { readOnly: true })
  const q = (s: string) => db.prepare(s).all() as Record<string, unknown>[]
  const m = mondoDaRighe(q(QUERY.meta), q(QUERY.club), q(QUERY.giocatori), q(QUERY.statistiche))
  const c = nuovaCarriera(m.club, m.giocatori, '46', m.stagione, 'mov')
  const p = c.calendario.find((x) => x.giornata === 1 && (x.casaId === '46' || x.ospiteId === '46'))!
  const xiC = xiDi(c, p.casaId), xiO = xiDi(c, p.ospiteId)
  const scena = creaScena(giocaPartita(p, xiC, xiO, 'mov'), { casa: { base: xiC, fasi: [] }, ospite: { base: xiO, fasi: [] } })
  const R = { gioco: 0.9, azione: 8 }
  let t = 0, ritmo: number | null = null, maxSalto = 0, vista: { x: number; y: number; h: number } | null = null, ultimoSal = true
  const pos = new Map<string, { x: number; y: number }>()
  let dist = 0, campioni = 0, fermi = 0, dt = 1 / 60; const per = { si: [0, 0], no: [0, 0] }
  for (let f = 0; f < 60 * 180; f++) {
    const sec = f / 60
    const voluto = salienteA(scena, t) || salienteA(scena, t + 0.5) ? R.azione : R.gioco
    const att = ritmo ?? voluto
    const nuovo = Math.exp(Math.log(att) + (Math.log(voluto) - Math.log(att)) * (1 - Math.exp(-dt / 0.4)))
    if (ritmo) maxSalto = Math.max(maxSalto, Math.max(nuovo / ritmo, ritmo / nuovo))
    ritmo = nuovo; t += dt / nuovo
    const s = statoScena(scena, t, ultimoSal ? undefined : (vista ?? undefined)); ultimoSal = s.saliente
    vista ??= { ...s.palla }; smorzaPalla(vista, s.palla, dt, s.saliente)
    for (const g of s.giocatori) {
      const v = vivacita(g, sec, s.possessoCasa)
      const pp = pos.get(g.id) ?? { x: g.x, y: g.y }
      const { dx, dy } = insegui(pp, { x: g.x + v.x, y: g.y + v.y }, dt, s.saliente)
      pos.set(g.id, pp)
      if (g.conPalla || g.ruolo === 'Goalkeeper') continue
      const vel = Math.hypot(dx, dy) / dt; dist += vel; campioni++; if (vel < 0.5) fermi++; const k = s.saliente ? 'si' : 'no'; per[k][0] += vel; per[k][1]++
    }
  }
  expect(per.si[0] / per.si[1]).toBeLessThan(9.5)
  expect(per.no[0] / per.no[1]).toBeLessThan(14)
  expect(fermi / campioni).toBeLessThan(0.1)
  expect(maxSalto).toBeLessThan(1.2)
})
