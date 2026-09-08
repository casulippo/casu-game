import { describe, expect, it } from 'vitest'
import { LATO_CITTA, calpestabile, generaCitta, puntoDiPartenza } from './city'
import { LUOGHI, celleOccupate } from './luoghi'

const mappa = generaCitta()

describe('generaCitta', () => {
  it('genera una griglia quadrata della dimensione richiesta', () => {
    expect(mappa).toHaveLength(LATO_CITTA)
    expect(mappa[0]).toHaveLength(LATO_CITTA)
  })

  it('e deterministica: due generazioni danno la stessa citta', () => {
    expect(generaCitta()).toEqual(generaCitta())
  })

  it('contiene la strada, i marciapiedi e il verde', () => {
    const tutte = new Set(mappa.flat())
    expect(tutte).toContain('strada')
    expect(tutte).toContain('marciapiede')
    expect(tutte).toContain('erba')
    expect(tutte).toContain('albero')
  })

  it('segna come edificio tutte le celle dei luoghi', () => {
    for (const luogo of LUOGHI) {
      for (const cella of celleOccupate(luogo)) {
        expect(mappa[cella.y][cella.x]).toBe('edificio')
      }
    }
  })
})

describe('calpestabile', () => {
  it('lascia passare sulla strada', () => {
    expect(calpestabile(mappa, 5, 10)).toBe(true)
  })

  it('blocca dentro gli edifici', () => {
    const cella = celleOccupate(LUOGHI[0])[0]
    expect(calpestabile(mappa, cella.x, cella.y)).toBe(false)
  })

  it('blocca contro gli alberi', () => {
    expect(calpestabile(mappa, 2, 2)).toBe(false)
  })

  it('blocca fuori dai bordi della mappa', () => {
    expect(calpestabile(mappa, -1, 5)).toBe(false)
    expect(calpestabile(mappa, 5, -1)).toBe(false)
    expect(calpestabile(mappa, LATO_CITTA, 5)).toBe(false)
    expect(calpestabile(mappa, 5, LATO_CITTA)).toBe(false)
  })

  it('tratta le coordinate frazionarie come la cella che le contiene', () => {
    const cella = celleOccupate(LUOGHI[0])[0]
    expect(calpestabile(mappa, cella.x + 0.9, cella.y + 0.9)).toBe(false)
  })

  it('lascia libera la porta di ogni luogo, altrimenti sarebbe irraggiungibile', () => {
    for (const luogo of LUOGHI) {
      expect(calpestabile(mappa, luogo.porta.x, luogo.porta.y)).toBe(true)
    }
  })
})

describe('puntoDiPartenza', () => {
  it('mette il giocatore in una cella libera', () => {
    const p = puntoDiPartenza(mappa)
    expect(calpestabile(mappa, p.x, p.y)).toBe(true)
  })
})
