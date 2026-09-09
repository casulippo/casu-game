import { describe, expect, it } from 'vitest'
import { LARGHEZZA, VIALI_X, VIALI_Y, pianoStradale, type Segmento } from './strade'
import { LATO_CITTA, QUARTIERI } from './quartieri'

const piano = pianoStradale()
const tutti = [...piano.verticali, ...piano.orizzontali]

describe('pianoStradale', () => {
  it('e deterministico: due letture danno lo stesso piano', () => {
    expect(pianoStradale()).toEqual(piano)
  })

  it('tiene ogni carreggiata dentro la mappa', () => {
    for (const s of tutti) {
      expect(s.da).toBeGreaterThanOrEqual(0)
      expect(s.da + s.larghezza).toBeLessThanOrEqual(LATO_CITTA)
    }
  })

  it('usa la larghezza prevista da ogni rango', () => {
    for (const s of tutti) expect(s.larghezza).toBe(LARGHEZZA[s.rango])
  })

  it('ha tutti e tre i ranghi: senza gerarchia sarebbe una maglia sola', () => {
    const ranghi = new Set(tutti.map((s) => s.rango))
    expect(ranghi).toContain('viale')
    expect(ranghi).toContain('strada')
    expect(ranghi).toContain('vicolo')
  })

  it('fa correre i viali sui confini dei quartieri, da un capo all altro', () => {
    const viali = tutti.filter((s) => s.rango === 'viale')

    for (const s of viali) {
      expect(s.inizio).toBe(0)
      expect(s.fine).toBe(LATO_CITTA)
    }

    expect(piano.verticali.filter(daViale).map((s) => s.da).sort(numerico)).toEqual(
      [...VIALI_X].sort(numerico),
    )
    expect(piano.orizzontali.filter(daViale).map((s) => s.da).sort(numerico)).toEqual(
      [...VIALI_Y].sort(numerico),
    )
  })

  /**
   * Il punto di tutto l'esercizio: se gli isolati tornassero tutti uguali, la
   * città sarebbe di nuovo carta millimetrata.
   */
  it('da isolati di misure diverse', () => {
    const profondita = distanzeTra(
      piano.verticali.filter((s) => s.rango === 'strada').map((s) => s.da),
    )

    expect(profondita.length).toBeGreaterThan(4)
    expect(new Set(profondita).size).toBeGreaterThan(2)
  })

  it('rispetta la misura d isolato dichiarata da ogni quartiere', () => {
    for (const q of QUARTIERI) {
      // I quartieri della stessa fascia condividono `inizio`: per isolare le
      // strade di uno solo serve anche guardare dove cadono.
      const dentro = piano.verticali
        .filter(
          (s) =>
            s.rango === 'strada' &&
            s.inizio === q.origine.y &&
            s.da >= q.origine.x &&
            s.da < q.origine.x + q.larghezza,
        )
        .map((s) => s.da)
        .sort(numerico)

      for (const distanza of distanzeTra(dentro)) {
        // La distanza tra due strade è il passo scelto più la carreggiata.
        expect(distanza).toBeGreaterThanOrEqual(q.isolato[0])
        expect(distanza).toBeLessThanOrEqual(q.isolato[1] + LARGHEZZA.strada)
      }
    }
  })
})

function daViale(s: Segmento): boolean {
  return s.rango === 'viale'
}

function numerico(a: number, b: number): number {
  return a - b
}

function distanzeTra(valori: number[]): number[] {
  const ordinati = [...valori].sort(numerico)
  const distanze: number[] = []
  for (let i = 1; i < ordinati.length; i++) distanze.push(ordinati[i] - ordinati[i - 1])
  return distanze
}
