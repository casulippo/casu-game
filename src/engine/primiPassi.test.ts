import { describe, expect, it } from 'vitest'
import {
  LIVELLO_DEI_PRIMI_PASSI,
  QUARTIERI_DA_VEDERE,
  cosaManca,
  haDormito,
  haMangiato,
  haParlatoCon,
  haVisto,
  livelloDi,
  primiPassiFatti,
} from './primiPassi'
import { dormi, mangia } from './azioniCasa'
import { puoAssumereSpaccini } from './livello'
import { incassa } from './spaccio'
import { statoIniziale, type GameState } from './state'

/** Tutti e quattro i primi passi, fatti nell'ordine in cui capitano giocando. */
function tuttiIPassi(da: GameState = statoIniziale()): GameState {
  return haVisto(haParlatoCon(haDormito(haMangiato(da)), 'venditore'), 'bandelle')
}

describe('i primi passi', () => {
  it('si comincia col solo quartiere di casa già visto', () => {
    const s = statoIniziale()

    expect(s.primiPassi.quartieriVisti).toEqual(['palazzoni'])
    expect(primiPassiFatti(s.primiPassi)).toBe(false)
    expect(s.giocatore.livello).toBe(1)
  })

  it('fatti tutti e quattro, si è di livello 3', () => {
    const dopo = tuttiIPassi()

    expect(primiPassiFatti(dopo.primiPassi)).toBe(true)
    expect(dopo.giocatore.livello).toBe(LIVELLO_DEI_PRIMI_PASSI)
    expect(puoAssumereSpaccini(dopo.giocatore.livello)).toBe(true)
  })

  it('tre su quattro non bastano', () => {
    const quasi = haParlatoCon(haDormito(haMangiato(statoIniziale())), 'venditore')

    expect(quasi.giocatore.livello).toBe(1)
    expect(cosaManca(quasi.primiPassi)).toHaveLength(1)
  })

  it('servono due quartieri diversi, non due passaggi nello stesso', () => {
    const fermo = haVisto(haVisto(statoIniziale(), 'palazzoni'), 'palazzoni')
    expect(fermo.primiPassi.quartieriVisti).toHaveLength(1)

    const girato = haVisto(statoIniziale(), 'centro')
    expect(girato.primiPassi.quartieriVisti).toHaveLength(QUARTIERI_DA_VEDERE)
  })

  it('parlare due volte con la stessa persona conta una volta sola', () => {
    const dopo = haParlatoCon(haParlatoCon(statoIniziale(), 'armiere'), 'armiere')
    expect(dopo.primiPassi.parlatoCon).toEqual(['armiere'])
  })

  it('dice cosa manca, e alla fine non dice più niente', () => {
    expect(cosaManca(statoIniziale().primiPassi)).toHaveLength(4)
    expect(cosaManca(tuttiIPassi().primiPassi)).toEqual([])
  })
})

describe('le due strade verso il livello', () => {
  it('vale la più avanti delle due', () => {
    const ricco = incassa(statoIniziale(), 20_000)
    expect(ricco.giocatore.livello).toBe(5)

    // I primi passi non fanno scendere chi è già più su.
    expect(tuttiIPassi(ricco).giocatore.livello).toBe(5)
  })

  it('chi arriva al 3 coi primi passi continua a salire incassando', () => {
    const dopo = incassa(tuttiIPassi(), 20_000)
    expect(dopo.giocatore.livello).toBe(5)
  })

  it('incassare poco non fa perdere il livello dei primi passi', () => {
    const dopo = incassa(tuttiIPassi(), 10)

    expect(dopo.giocatore.incassoTotale).toBe(10)
    expect(dopo.giocatore.livello).toBe(LIVELLO_DEI_PRIMI_PASSI)
  })

  it('livelloDi non tocca lo stato: dice solo quanto spetta', () => {
    const s = tuttiIPassi()
    expect(livelloDi(s)).toBe(LIVELLO_DEI_PRIMI_PASSI)
  })
})

describe('le azioni che li spuntano', () => {
  it('mangiare dal frigo conta come pasto', () => {
    expect(mangia(statoIniziale()).primiPassi.mangiato).toBe(true)
  })

  it('col frigo vuoto non conta: non hai mangiato niente', () => {
    const vuoto: GameState = { ...statoIniziale(), frigo: {} }
    expect(mangia(vuoto).primiPassi.mangiato).toBe(false)
  })

  it('dormire conta come dormita', () => {
    expect(dormi(statoIniziale(), 7).primiPassi.dormito).toBe(true)
  })
})
