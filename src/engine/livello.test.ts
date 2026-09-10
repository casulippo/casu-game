import { describe, expect, it } from 'vitest'
import {
  LIVELLO_MASSIMO,
  SOGLIE_LIVELLO,
  livelloPer,
  mancanoAllaProssima,
  nascondigliAttivi,
  puoAssumereSpaccini,
  tettoBazar,
} from './livello'

describe('livelloPer', () => {
  it('si comincia dall uno, con le tasche vuote', () => {
    expect(livelloPer(0)).toBe(1)
  })

  it('cento euro incassati portano al livello 2', () => {
    expect(livelloPer(99)).toBe(1)
    expect(livelloPer(100)).toBe(2)
  })

  it('sale di uno a ogni soglia, in ordine', () => {
    SOGLIE_LIVELLO.forEach((soglia, i) => {
      expect(livelloPer(soglia)).toBe(i + 2)
    })
  })

  it('non va oltre il massimo, per quanto si incassi', () => {
    expect(livelloPer(999_999_999)).toBe(LIVELLO_MASSIMO)
  })
})

describe('mancanoAllaProssima', () => {
  it('dice quanto resta da incassare', () => {
    expect(mancanoAllaProssima(40)).toBe(60)
  })

  it('in cima non manca più niente', () => {
    expect(mancanoAllaProssima(999_999_999)).toBeNull()
  })
})

describe('quello che il livello sblocca', () => {
  it('il bazar parte da 40 g e arriva a 400', () => {
    expect(tettoBazar(1)).toBe(40)
    expect(tettoBazar(LIVELLO_MASSIMO)).toBe(400)
  })

  it('il tetto non scende mai salendo di livello', () => {
    for (let l = 2; l <= LIVELLO_MASSIMO; l++) {
      expect(tettoBazar(l)).toBeGreaterThanOrEqual(tettoBazar(l - 1))
    }
  })

  it('regge anche livelli fuori scala, invece di restituire undefined', () => {
    expect(tettoBazar(0)).toBe(40)
    expect(tettoBazar(99)).toBe(400)
    expect(nascondigliAttivi(99)).toBe(nascondigliAttivi(LIVELLO_MASSIMO))
  })

  it('i nascondigli attivi crescono col livello', () => {
    expect(nascondigliAttivi(1)).toBe(2)
    expect(nascondigliAttivi(4)).toBeGreaterThan(nascondigliAttivi(2))
  })

  it('gli spaccini si assumono dal livello 3', () => {
    expect(puoAssumereSpaccini(2)).toBe(false)
    expect(puoAssumereSpaccini(3)).toBe(true)
  })
})
