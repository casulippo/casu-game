import { describe, expect, it } from 'vitest'
import {
  ORE_FRA_I_VERSAMENTI,
  VENDITE_PER_PROPOSTA,
  affidaMetaDella,
  assumi,
  avanzaSpaccini,
  cePropostaDiSpaccino,
  haDaVersare,
  ritira,
  robaAffidata,
  spaccinoAllaPortata,
  venditaAiRagazzini,
} from './spaccini'
import { grammiDi } from './droga'
import { statoIniziale, type GameState } from './state'

const RAGAZZINO = {
  id: 'nino',
  nome: 'Nino',
  quartiere: 'residenziale' as const,
  cella: { x: 20, y: 60 },
}

/** Livello 3 e due vendite ai ragazzini: le condizioni per assumere. */
function pronto(grammi = 40): GameState {
  const base = statoIniziale()
  const conRoba: GameState = {
    ...base,
    giocatore: {
      ...base.giocatore,
      livello: 3,
      incassoTotale: 1_500,
      roba: { marijuana: grammi },
    },
  }

  return venditaAiRagazzini(venditaAiRagazzini(conRoba))
}

function conSpaccino(grammi = 40): GameState {
  return affidaMetaDella(assumi(pronto(grammi), RAGAZZINO), 'nino', 'marijuana')
}

describe('la proposta', () => {
  it('arriva dopo due vendite ai ragazzini, non prima', () => {
    const base = statoIniziale()
    const cresciuto: GameState = {
      ...base,
      giocatore: { ...base.giocatore, livello: 3, incassoTotale: 1_500 },
    }

    expect(cePropostaDiSpaccino(cresciuto)).toBe(false)
    expect(cePropostaDiSpaccino(venditaAiRagazzini(cresciuto))).toBe(false)

    let s = cresciuto
    for (let i = 0; i < VENDITE_PER_PROPOSTA; i++) s = venditaAiRagazzini(s)
    expect(cePropostaDiSpaccino(s)).toBe(true)
  })

  it('sotto il livello 3 non se ne parla', () => {
    let s = statoIniziale()
    for (let i = 0; i < 5; i++) s = venditaAiRagazzini(s)

    expect(cePropostaDiSpaccino(s)).toBe(false)
    expect(assumi(s, RAGAZZINO).spaccini).toHaveLength(0)
  })

  it('non si assume due volte lo stesso', () => {
    const uno = assumi(pronto(), RAGAZZINO)
    expect(assumi(uno, RAGAZZINO).spaccini).toHaveLength(1)
  })
})

describe('affidare la roba', () => {
  it('gliene si lascia metà', () => {
    const dopo = conSpaccino(40)

    expect(grammiDi(dopo.giocatore.roba, 'marijuana')).toBe(20)
    expect(robaAffidata(dopo)).toBe(20)
  })

  it('con un grammo solo non c è niente da dividere', () => {
    const dopo = affidaMetaDella(assumi(pronto(1), RAGAZZINO), 'nino', 'marijuana')
    expect(robaAffidata(dopo)).toBe(0)
  })
})

describe('mentre lavorano', () => {
  it('la roba cala e la cassa sale', () => {
    const dopo = avanzaSpaccini(conSpaccino(), 2)
    const nino = dopo.spaccini[0]

    expect(nino.roba.marijuana).toBeLessThan(20)
    expect(nino.cassa).toBeGreaterThan(0)
  })

  it('finita la roba si fermano: non vanno a rifornirsi da soli', () => {
    const dopo = avanzaSpaccini(conSpaccino(), 100)
    const ancora = avanzaSpaccini(dopo, 100)

    expect(dopo.spaccini[0].roba).toEqual({})
    expect(ancora.spaccini[0].cassa).toBe(dopo.spaccini[0].cassa)
  })

  it('si tengono la loro parte: non ti danno il prezzo pieno', () => {
    const dopo = avanzaSpaccini(conSpaccino(), 100)
    // Venti grammi nelle case dei ricchi valgono più di 200 € al banco.
    expect(dopo.spaccini[0].cassa).toBeGreaterThan(0)
    expect(dopo.spaccini[0].cassa).toBeLessThan(20 * 13.6)
  })

  it('senza spaccini il tempo non cambia niente', () => {
    const solo = statoIniziale()
    expect(avanzaSpaccini(solo, 5)).toBe(solo)
  })
})

describe('ritirare', () => {
  it('prima del versamento non c è niente da prendere', () => {
    const poco = avanzaSpaccini(conSpaccino(), ORE_FRA_I_VERSAMENTI - 1)

    expect(haDaVersare(poco.spaccini[0])).toBe(false)
    expect(ritira(poco, 'nino')).toBe(poco)
  })

  it('passata l ora, i soldi entrano in tasca e nell incasso totale', () => {
    const pronto = avanzaSpaccini(conSpaccino(), ORE_FRA_I_VERSAMENTI)
    const dovuto = pronto.spaccini[0].cassa
    const dopo = ritira(pronto, 'nino')

    expect(dopo.giocatore.contante).toBe(pronto.giocatore.contante + dovuto)
    expect(dopo.giocatore.incassoTotale).toBe(pronto.giocatore.incassoTotale + dovuto)
    expect(dopo.spaccini[0].cassa).toBe(0)
  })

  it('si ritira passandoci sopra', () => {
    const pronto = avanzaSpaccini(conSpaccino(), ORE_FRA_I_VERSAMENTI)

    expect(spaccinoAllaPortata(pronto, { x: 20.5, y: 60.5 })?.id).toBe('nino')
    expect(spaccinoAllaPortata(pronto, { x: 30, y: 60 })).toBeNull()
  })
})
