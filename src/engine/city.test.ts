import { describe, expect, it } from 'vitest'
import {
  LATO_CITTA,
  calpestabile,
  generaCitta,
  mezzeriaIn,
  puntoDiPartenza,
  strisceIn,
  terrenoSotto,
} from './city'
import { LUOGHI, celleOccupate } from './luoghi'
import { pianoStradale } from './strade'

const mappa = generaCitta()

function cellaCon(tipo: string): { x: number; y: number } {
  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (mappa[y][x] === tipo) return { x, y }
    }
  }
  throw new Error(`Nessuna cella di tipo ${tipo} sulla mappa`)
}

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
    const strada = cellaCon('strada')
    expect(calpestabile(mappa, strada.x, strada.y)).toBe(true)
  })

  it('blocca dentro gli edifici', () => {
    const cella = celleOccupate(LUOGHI[0])[0]
    expect(calpestabile(mappa, cella.x, cella.y)).toBe(false)
  })

  it('blocca contro gli alberi', () => {
    // Cercato invece che fissato: la posizione degli alberi cambia a ogni
    // ritocco della griglia, e non è quello che questo test vuole verificare.
    const albero = cellaCon('albero')
    expect(calpestabile(mappa, albero.x, albero.y)).toBe(false)
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

/**
 * La segnaletica è ciò che distingue una carreggiata da una macchia d'asfalto:
 * se sparisce, o se attraversa gli incroci, la mappa torna illeggibile.
 */
describe('mezzeriaIn', () => {
  const celleDiStrada = () => {
    const celle: { x: number; y: number }[] = []
    for (let y = 0; y < LATO_CITTA; y++) {
      for (let x = 0; x < LATO_CITTA; x++) {
        if (terrenoSotto(x, y) === 'strada') celle.push({ x, y })
      }
    }
    return celle
  }

  it('non segna nulla fuori dalla carreggiata', () => {
    for (let y = 0; y < LATO_CITTA; y++) {
      for (let x = 0; x < LATO_CITTA; x++) {
        if (terrenoSotto(x, y) === 'strada') continue
        expect(senzaSegni(x, y)).toBe(true)
      }
    }
  })

  it('segna una parte consistente delle strade, tra mezzeria e attraversamenti', () => {
    const strade = celleDiStrada()
    const segnate = strade.filter((c) => {
      const m = mezzeriaIn(c.x, c.y)
      return m.verticale !== null || m.orizzontale !== null || strisceIn(c.x, c.y) !== null
    })

    expect(strade.length).toBeGreaterThan(0)
    expect(segnate.length / strade.length).toBeGreaterThan(0.25)
  })

  it('mette le zebre appena fuori dagli incroci, mai dentro', () => {
    const conStrisce = celleDiStrada().filter((c) => strisceIn(c.x, c.y) !== null)
    expect(conStrisce.length).toBeGreaterThan(20)

    // Dove ci sono le zebre la mezzeria tace: due segni sovrapposti non si
    // leggerebbero né come l'uno né come l'altro.
    for (const { x, y } of conStrisce) {
      expect(senzaSegni(x, y)).toBe(true)
    }
  })

  it('non traccia mai le due direzioni nella stessa cella: agli incroci si interrompe', () => {
    for (const { x, y } of celleDiStrada()) {
      const m = mezzeriaIn(x, y)
      expect(m.verticale === null || m.orizzontale === null).toBe(true)
    }
  })

  it('lascia i vicoli senza mezzeria: non hanno due sensi di marcia', () => {
    const vicoli = pianoStradale().verticali.filter((s) => s.rango === 'vicolo')
    expect(vicoli.length).toBeGreaterThan(0)

    for (const vicolo of vicoli) {
      for (let y = vicolo.inizio; y < vicolo.fine; y++) {
        // Dove un vicolo incrocia una strada vera comanda la strada.
        if (terrenoSotto(vicolo.da, y) !== 'strada') continue
        if (!senzaSegni(vicolo.da, y)) {
          expect(orizzontaleIn(vicolo.da, y)).toBe(true)
        }
      }
    }
  })
})

describe('puntoDiPartenza', () => {
  it('mette il giocatore in una cella libera', () => {
    const p = puntoDiPartenza(mappa)
    expect(calpestabile(mappa, p.x, p.y)).toBe(true)
  })
})

/** Nessuna mezzeria tracciata qui, in nessuna delle due direzioni. */
function senzaSegni(x: number, y: number): boolean {
  const m = mezzeriaIn(x, y)
  return m.verticale === null && m.orizzontale === null
}

/** La mezzeria qui è quella della strada trasversale, non del vicolo. */
function orizzontaleIn(x: number, y: number): boolean {
  return mezzeriaIn(x, y).orizzontale !== null
}
