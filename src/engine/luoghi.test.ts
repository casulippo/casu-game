import { describe, expect, it } from 'vitest'
import {
  LUOGHI,
  RAGGIO_PORTA,
  celleOccupate,
  luogoAllaPortata,
  luogoPerId,
} from './luoghi'
import { calpestabile, generaCitta, terrenoSotto } from './city'
import { quartiereIn } from './quartieri'

const casa = luogoPerId('casa')
const supermercato = luogoPerId('supermercato')

/** Il giocatore fermo esattamente sulla porta. */
const sullaPorta = (l: typeof casa) => ({
  x: l.porta.x + 0.5,
  y: l.porta.y + 0.5,
})

describe('celleOccupate', () => {
  it('copre tutto l ingombro dell edificio', () => {
    expect(celleOccupate(casa)).toHaveLength(casa.larghezza * casa.profondita)
  })

  it('parte dall origine dichiarata', () => {
    expect(celleOccupate(casa)[0]).toEqual(casa.origine)
  })
})

describe('la porta di ogni luogo', () => {
  it('sta fuori dall ingombro, altrimenti sarebbe dentro il muro', () => {
    for (const luogo of LUOGHI) {
      const dentro = celleOccupate(luogo).some(
        (c) => c.x === luogo.porta.x && c.y === luogo.porta.y,
      )
      expect(dentro).toBe(false)
    }
  })

  it('e adiacente all edificio, non staccata dall altra parte della strada', () => {
    for (const luogo of LUOGHI) {
      const distanze = celleOccupate(luogo).map((c) =>
        Math.hypot(c.x - luogo.porta.x, c.y - luogo.porta.y),
      )
      expect(Math.min(...distanze)).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('luogoAllaPortata', () => {
  it('trova la casa quando ci sei davanti', () => {
    expect(luogoAllaPortata(sullaPorta(casa))?.id).toBe('casa')
  })

  it('non trova niente in mezzo alla strada', () => {
    expect(luogoAllaPortata({ x: 2.5, y: 10.5 })).toBeNull()
  })

  it('segnala anche i luoghi chiusi, che non sono la stessa cosa di niente', () => {
    const trovato = luogoAllaPortata(sullaPorta(supermercato))
    expect(trovato?.id).toBe('supermercato')
    expect(trovato?.accessibile).toBe(false)
  })

  it('smette di rispondere allontanandosi dalla porta', () => {
    const lontano = {
      x: casa.porta.x + 0.5,
      y: casa.porta.y + 0.5 + RAGGIO_PORTA + 0.5,
    }
    expect(luogoAllaPortata(lontano)).toBeNull()
  })

  it('sceglie il piu vicino se due porte sono a portata', () => {
    const vicini = [
      { ...casa, id: 'vicina', porta: { x: 0, y: 0 } },
      { ...casa, id: 'lontana', porta: { x: 1, y: 0 } },
    ]
    expect(luogoAllaPortata({ x: 0.5, y: 0.5 }, vicini)?.id).toBe('vicina')
  })
})

describe('luogoPerId', () => {
  it('protesta se il luogo non esiste', () => {
    expect(() => luogoPerId('bar-inesistente')).toThrow()
  })
})

describe('dove stanno i luoghi sulla mappa', () => {
  const mappa = generaCitta()

  it('a ogni porta ci si arriva camminando', () => {
    for (const luogo of LUOGHI) {
      expect(calpestabile(mappa, luogo.porta.x, luogo.porta.y)).toBe(true)
    }
  })

  it('nessun edificio finisce in acqua o dentro una strada', () => {
    for (const luogo of LUOGHI) {
      for (const cella of celleOccupate(luogo)) {
        expect(terrenoSotto(cella.x, cella.y)).toBe('erba')
      }
    }
  })

  it('nessuno si sovrappone a un altro', () => {
    const occupate = new Set<string>()
    for (const luogo of LUOGHI) {
      for (const cella of celleOccupate(luogo)) {
        const chiave = `${cella.x},${cella.y}`
        expect(occupate.has(chiave)).toBe(false)
        occupate.add(chiave)
      }
    }
  })

  /** La mappa fissata nel design: ognuno nel quartiere della sua fazione. */
  it('stanno nel quartiere che gli spetta', () => {
    const atteso: Record<string, string> = {
      casa: 'palazzoni',
      bazar: 'palazzoni',
      armeria: 'bandelle',
      'mercato-nero': 'mafia',
      supermercato: 'residenziale',
    }

    for (const luogo of LUOGHI) {
      expect(quartiereIn(luogo.origine.x, luogo.origine.y).id).toBe(atteso[luogo.id])
    }
  })

  it('il bazar sta a due passi da casa, dietro le case a schiera', () => {
    const bazar = luogoPerId('bazar')
    const distanza = Math.hypot(
      bazar.porta.x - casa.porta.x,
      bazar.porta.y - casa.porta.y,
    )
    expect(distanza).toBeLessThan(12)
  })

  it('le botteghe si servono dalla soglia, non si visitano', () => {
    for (const id of ['bazar', 'armeria', 'mercato-nero']) {
      expect(luogoPerId(id).bottega).toBe(true)
    }
    expect(casa.bottega).toBeUndefined()
  })
})
