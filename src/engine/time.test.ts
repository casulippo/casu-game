import { describe, expect, it } from 'vitest'
import { avanza, faseGiorno, formattaOra, oreDaTempoReale } from './time'
import type { Tempo } from './state'

const alle = (ora: number, minuto = 0, giorno = 1): Tempo => ({
  giorno,
  ora,
  minuto,
})

describe('avanza', () => {
  it('somma le ore restando nello stesso giorno', () => {
    expect(avanza(alle(8), 3)).toEqual(alle(11))
  })

  it('gestisce le mezze ore', () => {
    expect(avanza(alle(8), 1.5)).toEqual(alle(9, 30))
  })

  it('passa al giorno dopo scavalcando la mezzanotte', () => {
    // Un turno di lavoro notturno: dalle 22 per 8 ore.
    expect(avanza(alle(22), 8)).toEqual(alle(6, 0, 2))
  })

  it('regge incrementi di più giorni interi', () => {
    // Una degenza in ospedale dopo un collasso da mancanza di sonno.
    expect(avanza(alle(12), 72)).toEqual(alle(12, 0, 4))
  })

  it('rifiuta di tornare indietro nel tempo', () => {
    expect(() => avanza(alle(8), -1)).toThrow()
  })
})

describe('oreDaTempoReale', () => {
  it('traduce 60 minuti reali in una giornata di gioco intera', () => {
    expect(oreDaTempoReale(60 * 60 * 1000)).toBeCloseTo(24)
  })

  it('un turno di lavoro da 8 ore costa circa 20 minuti reali', () => {
    const minutiReali = 20
    expect(oreDaTempoReale(minutiReali * 60 * 1000)).toBeCloseTo(8)
  })
})

describe('formattaOra', () => {
  it('mette lo zero davanti alle ore e ai minuti singoli', () => {
    expect(formattaOra(alle(8, 5))).toBe('08:05')
  })

  it('usa il formato 24 ore', () => {
    expect(formattaOra(alle(23, 59))).toBe('23:59')
  })
})

describe('faseGiorno', () => {
  it.each([
    [3, 'notte'],
    [9, 'mattina'],
    [15, 'pomeriggio'],
    [21, 'sera'],
    [23, 'notte'],
  ] as const)('alle %i è %s', (ora, atteso) => {
    expect(faseGiorno(alle(ora))).toBe(atteso)
  })
})
