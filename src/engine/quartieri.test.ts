import { describe, expect, it } from 'vitest'
import { LATO_CITTA, QUARTIERI, quartiereIn, quartierePerId } from './quartieri'
import { calpestabile, generaCitta } from './city'
import { LUOGHI } from './luoghi'

const mappa = generaCitta()

describe('disposizione dei quartieri', () => {
  it('nessuna zona esce dai confini della citta', () => {
    for (const q of QUARTIERI) {
      expect(q.origine.x + q.larghezza).toBeLessThanOrEqual(LATO_CITTA)
      expect(q.origine.y + q.altezza).toBeLessThanOrEqual(LATO_CITTA)
    }
  })

  it('le zone non si sovrappongono', () => {
    for (const a of QUARTIERI) {
      for (const b of QUARTIERI) {
        if (a.id === b.id) continue
        const separati =
          a.origine.x + a.larghezza <= b.origine.x ||
          b.origine.x + b.larghezza <= a.origine.x ||
          a.origine.y + a.altezza <= b.origine.y ||
          b.origine.y + b.altezza <= a.origine.y
        expect(separati).toBe(true)
      }
    }
  })

  it('ogni zona dichiarata e davvero raggiungibile sulla mappa', () => {
    for (const q of QUARTIERI) {
      const centro = {
        x: q.origine.x + Math.floor(q.larghezza / 2),
        y: q.origine.y + Math.floor(q.altezza / 2),
      }
      expect(quartiereIn(centro.x, centro.y).id).toBe(q.id)
    }
  })

  it('protesta se il quartiere non esiste', () => {
    // @ts-expect-error id inventato apposta
    expect(() => quartierePerId('atlantide')).toThrow()
  })
})

describe('misura degli isolati', () => {
  it('il centro storico ha isolati più minuti dei piazzali del porto', () => {
    expect(quartierePerId('centro').isolato[1]).toBeLessThan(
      quartierePerId('porto').isolato[0],
    )
  })
})

/**
 * Il test che conta su una mappa generata: si può davvero arrivare ovunque?
 *
 * Con strade calcolate invece che disegnate a mano, è facile che un isolato
 * resti murato o che un quartiere si stacchi dal resto senza che nulla lo
 * segnali. Camminarci per accorgersene non è un piano.
 */
describe('la citta e percorribile', () => {
  const raggiungibili = esploraAPiedi()

  it('si raggiunge ogni quartiere partendo da casa', () => {
    for (const q of QUARTIERI) {
      const celleDellaZona = [...raggiungibili].filter((chiave) => {
        const [x, y] = chiave.split(',').map(Number)
        return quartiereIn(x, y).id === q.id
      })
      expect(celleDellaZona.length).toBeGreaterThan(20)
    }
  })

  /**
   * Non basta metterci piede: un quartiere in cui si raggiunge solo il bordo
   * è di fatto inesplorabile. Con i vicoli calcolati della periferia è un
   * rischio concreto, e a occhio non si noterebbe.
   */
  it('di ogni quartiere e percorribile una porzione consistente', () => {
    for (const q of QUARTIERI) {
      const celleTotali = q.larghezza * q.altezza
      const raggiunte = [...raggiungibili].filter((chiave) => {
        const [x, y] = chiave.split(',').map(Number)
        return quartiereIn(x, y).id === q.id
      }).length

      const quota = raggiunte / celleTotali
      expect(
        quota,
        `${q.nome}: percorribile solo il ${(quota * 100).toFixed(1)}%`,
      ).toBeGreaterThan(0.15)
    }
  })

  it('si raggiunge la porta di ogni luogo', () => {
    for (const luogo of LUOGHI) {
      expect(raggiungibili.has(`${luogo.porta.x},${luogo.porta.y}`)).toBe(true)
    }
  })
})

/** Riempimento a partire dalla porta di casa, muovendosi solo dove si può. */
function esploraAPiedi(): Set<string> {
  const casa = LUOGHI.find((l) => l.id === 'casa')!
  const partenza = { x: casa.porta.x, y: casa.porta.y }

  const visti = new Set<string>([`${partenza.x},${partenza.y}`])
  const coda = [partenza]

  while (coda.length > 0) {
    const { x, y } = coda.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      const chiave = `${nx},${ny}`
      if (visti.has(chiave)) continue
      if (!calpestabile(mappa, nx, ny)) continue

      visti.add(chiave)
      coda.push({ x: nx, y: ny })
    }
  }

  return visti
}
