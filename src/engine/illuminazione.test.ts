import { describe, expect, it } from 'vitest'
import { illuminazione, luciAccese, mescolaColore } from './illuminazione'
import type { Tempo } from './state'

const alle = (ora: number, minuto = 0): Tempo => ({ giorno: 1, ora, minuto })

describe('mescolaColore', () => {
  it('agli estremi restituisce i colori di partenza e arrivo', () => {
    expect(mescolaColore(0x000000, 0xffffff, 0)).toBe(0x000000)
    expect(mescolaColore(0x000000, 0xffffff, 1)).toBe(0xffffff)
  })

  it('a meta strada sta in mezzo', () => {
    expect(mescolaColore(0x000000, 0xffffff, 0.5)).toBe(0x808080)
  })

  it('interpola i canali separatamente', () => {
    expect(mescolaColore(0xff0000, 0x00ff00, 0.5)).toBe(0x808000)
  })
})

describe('illuminazione', () => {
  it('a mezzogiorno la luce e piena e non altera i colori', () => {
    const luce = illuminazione(alle(12))
    expect(luce.tinta).toBe(0xffffff)
    expect(luce.luci).toBe(0)
  })

  it('a notte fonda le luci artificiali sono accese', () => {
    expect(luciAccese(illuminazione(alle(2)))).toBe(true)
  })

  it('a mezzogiorno le luci artificiali sono spente', () => {
    expect(luciAccese(illuminazione(alle(12)))).toBe(false)
  })

  it('cambia con continuita, senza salti tra un minuto e il successivo', () => {
    let precedente = illuminazione(alle(0))

    for (let minuti = 1; minuti < 24 * 60; minuti++) {
      const attuale = illuminazione(alle(Math.floor(minuti / 60), minuti % 60))
      expect(Math.abs(attuale.luci - precedente.luci)).toBeLessThan(0.05)
      precedente = attuale
    }
  })

  it('copre tutte le ore del giorno senza buchi', () => {
    for (let ora = 0; ora < 24; ora++) {
      for (const minuto of [0, 30, 59]) {
        const luce = illuminazione(alle(ora, minuto))
        expect(luce.luci).toBeGreaterThanOrEqual(0)
        expect(luce.luci).toBeLessThanOrEqual(1)
        expect(luce.cielo).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('si accende gradualmente calando la sera', () => {
    const pomeriggio = illuminazione(alle(16))
    const tramonto = illuminazione(alle(18, 30))
    const sera = illuminazione(alle(20))
    const notte = illuminazione(alle(22))

    expect(pomeriggio.luci).toBeLessThan(tramonto.luci)
    expect(tramonto.luci).toBeLessThan(sera.luci)
    expect(sera.luci).toBeLessThan(notte.luci)
  })

  it('mezzanotte e le 24 sono lo stesso momento, il ciclo si chiude', () => {
    expect(illuminazione(alle(0)).cielo).toBe(illuminazione(alle(23, 59)).cielo)
  })
})
