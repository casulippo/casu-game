import { describe, expect, it } from 'vitest'
import { FAME_CHE_PESA, penalitaDaFame, statisticheEffettive } from './statistiche'
import { compraStrumento } from './negozi'
import { probabilitaVendita } from './spaccio'
import { statoIniziale, type GameState } from './state'

function conFame(livello: number): GameState {
  return { ...statoIniziale(), fame: { livello } }
}

describe('la fame', () => {
  it('fino alla soglia è appetito, e non pesa', () => {
    expect(penalitaDaFame(conFame(0))).toBe(0)
    expect(penalitaDaFame(conFame(FAME_CHE_PESA))).toBe(0)
  })

  it('oltre la soglia comincia a costare, e peggiora', () => {
    const poca = penalitaDaFame(conFame(FAME_CHE_PESA + 10))
    const tanta = penalitaDaFame(conFame(100))

    expect(poca).toBeGreaterThan(0)
    expect(tanta).toBeGreaterThan(poca)
  })

  it('a stomaco vuoto si spara peggio e si vende peggio', () => {
    const sazio = conFame(10)
    const stremato = conFame(100)

    expect(statisticheEffettive(stremato).mira).toBeLessThan(
      statisticheEffettive(sazio).mira,
    )
    expect(probabilitaVendita(stremato, 'centro')).toBeLessThan(
      probabilitaVendita(sazio, 'centro'),
    )
  })
})

describe('statisticheEffettive', () => {
  it('somma quello che si ha addosso alla base', () => {
    const base = statoIniziale()
    const conSoldi: GameState = {
      ...base,
      giocatore: { ...base.giocatore, contante: 5_000 },
    }
    const protetto = compraStrumento(conSoldi, 'giubbotto').stato

    expect(statisticheEffettive(protetto).vita).toBe(120)
  })

  it('la fame taglia anche i bonus degli strumenti', () => {
    const base = statoIniziale()
    const conSoldi: GameState = {
      ...base,
      giocatore: { ...base.giocatore, contante: 5_000 },
    }
    const protetto = compraStrumento(conSoldi, 'giubbotto').stato
    const affamato: GameState = { ...protetto, fame: { livello: 100 } }

    expect(statisticheEffettive(affamato).vita).toBeLessThan(120)
  })

  it('non tocca le statistiche scritte nello stato', () => {
    const affamato = conFame(100)
    statisticheEffettive(affamato)

    expect(affamato.giocatore.statistiche.mira).toBe(30)
  })
})
