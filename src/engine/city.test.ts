import { describe, expect, it } from 'vitest'
import {
  LATO_CITTA,
  calpestabile,
  generaCitta,
  pianiEdificio,
  puntoDiPartenza,
} from './city'

const mappa = generaCitta()

describe('generaCitta', () => {
  it('genera una griglia quadrata della dimensione richiesta', () => {
    expect(mappa).toHaveLength(LATO_CITTA)
    expect(mappa[0]).toHaveLength(LATO_CITTA)
  })

  it('contiene sia strade che edifici', () => {
    const tutte = mappa.flat()
    expect(tutte).toContain('strada')
    expect(tutte).toContain('edificio')
  })

  it('e deterministica: due generazioni danno la stessa citta', () => {
    expect(generaCitta()).toEqual(generaCitta())
  })
})

describe('calpestabile', () => {
  it('lascia passare sulle strade', () => {
    expect(calpestabile(mappa, 0, 0)).toBe(true)
  })

  it('blocca dentro gli edifici', () => {
    const edificio = trovaCella('edificio')
    expect(calpestabile(mappa, edificio.x, edificio.y)).toBe(false)
  })

  it('blocca fuori dai bordi della mappa', () => {
    expect(calpestabile(mappa, -1, 5)).toBe(false)
    expect(calpestabile(mappa, 5, -1)).toBe(false)
    expect(calpestabile(mappa, LATO_CITTA, 5)).toBe(false)
    expect(calpestabile(mappa, 5, LATO_CITTA)).toBe(false)
  })

  it('tratta le coordinate frazionarie come la cella che le contiene', () => {
    const edificio = trovaCella('edificio')
    expect(calpestabile(mappa, edificio.x + 0.9, edificio.y + 0.9)).toBe(false)
  })
})

describe('pianiEdificio', () => {
  it('da sempre lo stesso numero di piani per la stessa cella', () => {
    expect(pianiEdificio(7, 3)).toBe(pianiEdificio(7, 3))
  })

  it('sta tra 2 e 5 piani', () => {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const piani = pianiEdificio(x, y)
        expect(piani).toBeGreaterThanOrEqual(2)
        expect(piani).toBeLessThanOrEqual(5)
      }
    }
  })

  it('non da lo stesso valore a tutta la citta', () => {
    const valori = new Set<number>()
    for (let x = 0; x < 10; x++) valori.add(pianiEdificio(x, 4))
    expect(valori.size).toBeGreaterThan(1)
  })
})

describe('puntoDiPartenza', () => {
  it('mette il giocatore in una cella libera', () => {
    const p = puntoDiPartenza(mappa)
    expect(calpestabile(mappa, p.x, p.y)).toBe(true)
  })
})

function trovaCella(tipo: string) {
  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (mappa[y][x] === tipo) return { x, y }
    }
  }
  throw new Error(`nessuna cella di tipo ${tipo}`)
}
