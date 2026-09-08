import { describe, expect, it } from 'vitest'
import {
  calpestabileInterno,
  cellaUscita,
  generaInterno,
  ingresso,
  sullUscita,
} from './interni'

const stanza = generaInterno()

describe('generaInterno', () => {
  it('produce una stanza non vuota', () => {
    expect(stanza.length).toBeGreaterThan(0)
    expect(stanza[0].length).toBeGreaterThan(0)
  })

  it('contiene i mobili previsti', () => {
    const tutte = new Set(stanza.flat())
    expect(tutte).toContain('letto')
    expect(tutte).toContain('tavolo')
    expect(tutte).toContain('uscita')
  })

  it('e circondata da muri, cosi non si esce dai lati', () => {
    const ultimaRiga = stanza.length - 1
    for (let x = 0; x < stanza[0].length; x++) {
      expect(stanza[0][x]).toBe('muro')
    }
    for (let y = 0; y < stanza.length; y++) {
      expect(stanza[y][0]).toBe('muro')
      expect(stanza[y][stanza[y].length - 1]).toBe('muro')
    }
    // In fondo c'è l'uscita, quindi non è tutto muro.
    expect(stanza[ultimaRiga]).toContain('uscita')
  })
})

describe('calpestabileInterno', () => {
  it('lascia camminare sul pavimento', () => {
    expect(calpestabileInterno(stanza, 4, 4)).toBe(true)
  })

  it('blocca contro i muri', () => {
    expect(calpestabileInterno(stanza, 0, 0)).toBe(false)
  })

  it('blocca contro i mobili', () => {
    expect(calpestabileInterno(stanza, 1, 1)).toBe(false)
  })

  it('blocca fuori dalla stanza', () => {
    expect(calpestabileInterno(stanza, -1, 3)).toBe(false)
    expect(calpestabileInterno(stanza, 3, 99)).toBe(false)
  })
})

describe('ingresso', () => {
  it('mette il giocatore su una cella libera', () => {
    const p = ingresso(stanza)
    expect(calpestabileInterno(stanza, p.x, p.y)).toBe(true)
  })

  it('lo mette vicino all uscita, non in mezzo alla stanza', () => {
    expect(sullUscita(stanza, ingresso(stanza))).toBe(true)
  })
})

describe('sullUscita', () => {
  it('riconosce chi e sulla soglia', () => {
    const u = cellaUscita(stanza)
    expect(sullUscita(stanza, { x: u.x + 0.5, y: u.y + 0.5 })).toBe(true)
  })

  it('non scatta dall altra parte della stanza', () => {
    expect(sullUscita(stanza, { x: 1.5, y: 1.5 })).toBe(false)
  })
})
