import { describe, expect, it } from 'vitest'
import {
  TILE_H,
  TILE_W,
  direzioneSchermoAGriglia,
  grigliaASchermo,
  profondita,
  schermoAGriglia,
} from './iso'

describe('grigliaASchermo', () => {
  it('mette l origine della griglia all origine dello schermo', () => {
    expect(grigliaASchermo({ x: 0, y: 0 })).toEqual({ sx: 0, sy: 0 })
  })

  it('sposta a destra e in basso muovendosi lungo x', () => {
    expect(grigliaASchermo({ x: 1, y: 0 })).toEqual({
      sx: TILE_W / 2,
      sy: TILE_H / 2,
    })
  })

  it('sposta a sinistra e in basso muovendosi lungo y', () => {
    expect(grigliaASchermo({ x: 0, y: 1 })).toEqual({
      sx: -TILE_W / 2,
      sy: TILE_H / 2,
    })
  })

  it('celle sulla diagonale x=y stanno sulla verticale centrale', () => {
    expect(grigliaASchermo({ x: 3, y: 3 }).sx).toBe(0)
  })
})

describe('schermoAGriglia', () => {
  it('annulla grigliaASchermo (andata e ritorno)', () => {
    for (const cella of [
      { x: 0, y: 0 },
      { x: 5, y: 2 },
      { x: 12, y: 19 },
      { x: 3.5, y: 7.25 },
    ]) {
      const ritorno = schermoAGriglia(grigliaASchermo(cella))
      expect(ritorno.x).toBeCloseTo(cella.x)
      expect(ritorno.y).toBeCloseTo(cella.y)
    }
  })
})

describe('profondita', () => {
  it('ordina chi sta davanti dopo chi sta dietro', () => {
    const dietro = { x: 2, y: 2 }
    const davanti = { x: 5, y: 5 }
    expect(profondita(davanti)).toBeGreaterThan(profondita(dietro))
  })

  it('da la stessa profondita a celle sulla stessa fascia', () => {
    expect(profondita({ x: 1, y: 4 })).toBe(profondita({ x: 4, y: 1 }))
  })
})

describe('direzioneSchermoAGriglia', () => {
  it('sta ferma se non premi niente', () => {
    expect(direzioneSchermoAGriglia(false, false, false, false)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('premendo su, il personaggio sale sullo schermo', () => {
    const dir = direzioneSchermoAGriglia(true, false, false, false)
    const partenza = grigliaASchermo({ x: 10, y: 10 })
    const arrivo = grigliaASchermo({ x: 10 + dir.x, y: 10 + dir.y })
    expect(arrivo.sy).toBeLessThan(partenza.sy)
  })

  it('premendo destra, il personaggio va a destra sullo schermo', () => {
    const dir = direzioneSchermoAGriglia(false, false, false, true)
    const partenza = grigliaASchermo({ x: 10, y: 10 })
    const arrivo = grigliaASchermo({ x: 10 + dir.x, y: 10 + dir.y })
    expect(arrivo.sx).toBeGreaterThan(partenza.sx)
  })

  it('le direzioni opposte si annullano', () => {
    expect(direzioneSchermoAGriglia(true, true, false, false)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('la diagonale non e piu veloce della direzione dritta', () => {
    const dritto = direzioneSchermoAGriglia(true, false, false, false)
    const diagonale = direzioneSchermoAGriglia(true, false, false, true)
    expect(Math.hypot(dritto.x, dritto.y)).toBeCloseTo(1)
    expect(Math.hypot(diagonale.x, diagonale.y)).toBeCloseTo(1)
  })
})
