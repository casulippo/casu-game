import { describe, expect, it } from 'vitest'
import {
  colpisciPassante,
  grammiRichiesti,
  incassa,
  prezzoAlGrammo,
  probabilitaVendita,
  rischioVendita,
  vendi,
} from './spaccio'
import { grammiDi } from './droga'
import { SOGLIE_LIVELLO } from './livello'
import { statoIniziale, type GameState } from './state'

function conRobaInTasca(grammi = 50): GameState {
  const base = statoIniziale()
  return {
    ...base,
    giocatore: { ...base.giocatore, roba: { marijuana: grammi } },
  }
}

/** Un tiro che vende sempre, e uno che non vende mai. */
const VENDE = 0
const NON_VENDE = 1

describe('prezzi di strada', () => {
  it('nei quartieri ricchi l erba va a dieci euro al grammo', () => {
    expect(prezzoAlGrammo('marijuana', 'residenziale')).toBeGreaterThanOrEqual(10)
  })

  it('più il quartiere è ricco, più si guadagna', () => {
    expect(prezzoAlGrammo('marijuana', 'residenziale')).toBeGreaterThan(
      prezzoAlGrammo('marijuana', 'bandelle'),
    )
  })

  it('nelle case dei ricchi si vende a trenta euro alla volta', () => {
    const taglio = grammiRichiesti('residenziale')
    expect(taglio).toBe(3)
    expect(taglio * prezzoAlGrammo('marijuana', 'residenziale')).toBeGreaterThanOrEqual(30)
  })

  it('dove non c è una lira si compra un grammo per volta', () => {
    expect(grammiRichiesti('bandelle')).toBe(1)
  })
})

describe('rischio', () => {
  it('si rischia più in centro che dalle bandelle', () => {
    expect(rischioVendita('marijuana', 'centro')).toBeGreaterThan(
      rischioVendita('marijuana', 'bandelle'),
    )
  })

  it('la roba pesante scotta più dell erba, a parità di quartiere', () => {
    expect(rischioVendita('cocaina', 'notturna')).toBeGreaterThan(
      rischioVendita('marijuana', 'notturna'),
    )
  })
})

describe('vendi', () => {
  it('consegna la roba e intasca', () => {
    const esito = vendi(conRobaInTasca(), 'residenziale', 'marijuana', VENDE)

    expect(esito.venduto).toBe(true)
    expect(esito.grammi).toBe(3)
    expect(esito.incasso).toBe(esito.grammi * prezzoAlGrammo('marijuana', 'residenziale'))
    expect(grammiDi(esito.stato.giocatore.roba, 'marijuana')).toBe(47)
    expect(esito.stato.giocatore.contante).toBe(
      statoIniziale().giocatore.contante + esito.incasso,
    )
  })

  it('senza roba non si vende, per quanto vada bene il tiro', () => {
    const esito = vendi(statoIniziale(), 'residenziale', 'marijuana', VENDE)
    expect(esito.motivo).toBe('senza-roba')
    expect(esito.venduto).toBe(false)
  })

  it('col tiro alto il cliente tira dritto e non cambia niente', () => {
    const prima = conRobaInTasca()
    const esito = vendi(prima, 'residenziale', 'marijuana', NON_VENDE)

    expect(esito.motivo).toBe('nessun-cliente')
    expect(esito.stato).toBe(prima)
  })

  it('vende quel poco che resta invece di rifiutare il cliente', () => {
    const esito = vendi(conRobaInTasca(1), 'residenziale', 'marijuana', VENDE)
    expect(esito.grammi).toBe(1)
    expect(esito.stato.giocatore.roba.marijuana).toBeUndefined()
  })
})

describe('quota clienti', () => {
  it('ogni passante colpito ne brucia il 30%', () => {
    const dopo = colpisciPassante(statoIniziale())
    expect(dopo.mercato.quotaClienti).toBe(0.7)
    expect(colpisciPassante(dopo).mercato.quotaClienti).toBe(0.49)
  })

  it('sparare nel mucchio abbassa le vendite, non solo l umore', () => {
    const pulito = conRobaInTasca()
    const infame = colpisciPassante(colpisciPassante(pulito))

    expect(probabilitaVendita(infame, 'residenziale')).toBeLessThan(
      probabilitaVendita(pulito, 'residenziale'),
    )
  })

  it('la socialità aiuta a piazzare la roba', () => {
    const base = conRobaInTasca()
    const simpatico: GameState = {
      ...base,
      giocatore: {
        ...base.giocatore,
        statistiche: { ...base.giocatore.statistiche, socialita: 100 },
      },
    }

    expect(probabilitaVendita(simpatico, 'centro')).toBeGreaterThan(
      probabilitaVendita(base, 'centro'),
    )
  })
})

describe('incassa', () => {
  it('il livello sale alla soglia e non torna indietro', () => {
    const ricco = incassa(statoIniziale(), SOGLIE_LIVELLO[0])
    expect(ricco.giocatore.livello).toBe(2)

    const svaligiato: GameState = {
      ...ricco,
      giocatore: { ...ricco.giocatore, contante: 0 },
    }
    expect(svaligiato.giocatore.livello).toBe(2)
    expect(incassa(svaligiato, 0).giocatore.incassoTotale).toBe(SOGLIE_LIVELLO[0])
  })

  it('l incasso totale somma tutto quello che è passato per le mani', () => {
    const dopo = incassa(incassa(statoIniziale(), 30), 45)
    expect(dopo.giocatore.incassoTotale).toBe(75)
  })
})
