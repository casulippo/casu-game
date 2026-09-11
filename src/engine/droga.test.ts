import { describe, expect, it } from 'vitest'
import {
  acquistaAlBazar,
  grammiComprabili,
  conRoba,
  drogheAlBazar,
  grammiDi,
  grammiTotali,
} from './droga'
import { tettoBazar } from './livello'
import { statoIniziale, type GameState } from './state'

function stato(modifiche: Partial<GameState['giocatore']> = {}): GameState {
  const base = statoIniziale()
  return { ...base, giocatore: { ...base.giocatore, ...modifiche } }
}

describe('drogheAlBazar', () => {
  it('all inizio c è solo l erba', () => {
    expect(drogheAlBazar(0).map((d) => d.id)).toEqual(['marijuana'])
  })

  it('l MD arriva a cinquemila, l LSD a ventimila', () => {
    expect(drogheAlBazar(5_000).map((d) => d.id)).toEqual(['marijuana', 'md'])
    expect(drogheAlBazar(20_000).map((d) => d.id)).toContain('lsd')
  })

  it('la roba pesante non passa dal bazar, per quanto si incassi', () => {
    const ids = drogheAlBazar(1_000_000).map((d) => d.id)
    expect(ids).not.toContain('cocaina')
    expect(ids).not.toContain('eroina')
  })
})

describe('inventario', () => {
  it('somma e sottrae grammi', () => {
    const dopo = conRoba(conRoba({}, 'marijuana', 30), 'marijuana', -12)
    expect(grammiDi(dopo, 'marijuana')).toBe(18)
  })

  it('non scende sotto zero, e la voce vuota sparisce', () => {
    const dopo = conRoba({ marijuana: 5 }, 'marijuana', -50)
    expect(grammiDi(dopo, 'marijuana')).toBe(0)
    expect('marijuana' in dopo).toBe(false)
  })

  it('conta tutti i tipi insieme', () => {
    expect(grammiTotali({ marijuana: 10, md: 4 })).toBe(14)
  })
})

describe('acquistaAlBazar', () => {
  it('scala il contante e consegna la roba', () => {
    const esito = acquistaAlBazar(stato({ contante: 100 }), 'marijuana', 10)

    expect(esito.motivo).toBe('ok')
    expect(esito.grammi).toBe(10)
    expect(esito.spesa).toBe(40)
    expect(esito.stato.giocatore.contante).toBe(60)
    expect(grammiDi(esito.stato.giocatore.roba, 'marijuana')).toBe(10)
  })

  it('non vende quello che non è ancora sbloccato', () => {
    const prima = stato({ contante: 10_000 })
    const esito = acquistaAlBazar(prima, 'md', 10)

    expect(esito.motivo).toBe('non-disponibile')
    expect(esito.grammi).toBe(0)
    expect(esito.stato).toBe(prima)
  })

  it('taglia l ordine al tetto giornaliero invece di rifiutarlo', () => {
    const esito = acquistaAlBazar(stato({ contante: 10_000 }), 'marijuana', 999)
    expect(esito.grammi).toBe(tettoBazar(1))
  })

  it('il tetto vale per la giornata, non per il singolo acquisto', () => {
    const primo = acquistaAlBazar(stato({ contante: 10_000 }), 'marijuana', 40)
    const secondo = acquistaAlBazar(primo.stato, 'marijuana', 10)

    expect(primo.grammi).toBe(40)
    expect(secondo.motivo).toBe('tetto-raggiunto')
    expect(secondo.grammi).toBe(0)
  })

  it('compra quel che il contante permette, non di più', () => {
    const esito = acquistaAlBazar(stato({ contante: 10 }), 'marijuana', 20)
    expect(esito.grammi).toBe(2)
    expect(esito.stato.giocatore.contante).toBe(2)
  })

  it('con le tasche vuote non compra niente', () => {
    const esito = acquistaAlBazar(stato({ contante: 0 }), 'marijuana', 20)
    expect(esito.motivo).toBe('senza-soldi')
    expect(esito.grammi).toBe(0)
  })

  /** L'offerta della prima missione: 200 g a 100 €, tetto e livello permettendo. */
  it('accetta un prezzo di favore diverso dal listino', () => {
    const spacciatore = stato({ contante: 100, livello: 5, incassoTotale: 20_000 })
    const esito = acquistaAlBazar(spacciatore, 'marijuana', 200, 0.5)

    expect(esito.grammi).toBe(200)
    expect(esito.spesa).toBe(100)
    expect(esito.stato.giocatore.contante).toBe(0)
  })
})

describe('grammiComprabili', () => {
  it('con venti euro in tasca sono cinque grammi, non dieci', () => {
    expect(grammiComprabili(stato({ contante: 20 }), 'marijuana')).toBe(5)
  })

  it('il tetto della giornata taglia prima del contante', () => {
    const ricco = stato({ contante: 100_000 })
    expect(grammiComprabili(ricco, 'marijuana')).toBe(tettoBazar(1))
  })

  it('tiene conto di quello che si è già preso oggi', () => {
    const dopoUnGiro = acquistaAlBazar(stato({ contante: 10_000 }), 'marijuana', 30).stato
    expect(grammiComprabili(dopoUnGiro, 'marijuana')).toBe(tettoBazar(1) - 30)
  })

  it('quello che non è sbloccato non si compra affatto', () => {
    expect(grammiComprabili(stato({ contante: 10_000 }), 'md')).toBe(0)
  })

  it('a tasche vuote è zero, non un numero negativo', () => {
    expect(grammiComprabili(stato({ contante: 0 }), 'marijuana')).toBe(0)
  })

  it('promette solo quello che l acquisto poi mantiene', () => {
    const povero = stato({ contante: 37 })
    const promessi = grammiComprabili(povero, 'marijuana')

    expect(acquistaAlBazar(povero, 'marijuana', 999).grammi).toBe(promessi)
  })
})
