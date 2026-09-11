import { describe, expect, it } from 'vitest'
import { aggiornaFolla, follaAttesa } from './folla'
import { avanza, iniziaScontro, type Comandi, type Scontro } from './combattimento'

const FERMO: Comandi = { direzione: { x: 0, y: 0 }, mira: null, spara: false }
const CENTRO = { x: 50, y: 50 }

function strada(): Scontro {
  return iniziaScontro({
    tipo: 'strada',
    posGiocatore: CENTRO,
    arma: 'pistola',
    vita: 100,
    mira: 100,
    nemici: [],
  })
}

/** Un caso finto che scorre una sequenza e poi la ricomincia. */
function dadi(valori: number[]): () => number {
  let i = 0
  return () => valori[i++ % valori.length]
}

function conFolla(quanti: number, opzioni: { dt?: number } = {}): Scontro {
  let s = strada()
  for (let i = 0; i < quanti * 4; i++) {
    s = aggiornaFolla(s, {
      dt: opzioni.dt ?? 1,
      quartiere: 'centro',
      posGiocatore: CENTRO,
      calpestabile: () => true,
      caso: Math.random,
    })
  }
  return s
}

describe('quanta gente gira', () => {
  it('nei quartieri vivi più che dove non c è nessuno', () => {
    expect(follaAttesa('centro')).toBeGreaterThan(follaAttesa('bandelle'))
  })
})

describe('il ricambio', () => {
  it('la strada si riempie fino al numero atteso, e non oltre', () => {
    const dopo = conFolla(40)
    const passanti = dopo.nemici.filter((n) => n.tipo === 'passante')

    expect(passanti.length).toBe(follaAttesa('centro'))
  })

  it('chi nasce ha una strada sua da fare', () => {
    const dopo = conFolla(10)
    const uno = dopo.nemici.find((n) => n.tipo === 'passante')!

    expect(uno.verso).toBeDefined()
    expect(Math.hypot(uno.verso!.x, uno.verso!.y)).toBeCloseTo(1)
  })

  it('nasce a distanza: non spunta in faccia', () => {
    const dopo = conFolla(10)
    for (const p of dopo.nemici) {
      expect(Math.hypot(p.pos.x - CENTRO.x, p.pos.y - CENTRO.y)).toBeGreaterThan(2)
    }
  })

  it('dove non si può camminare non nasce nessuno', () => {
    const dopo = aggiornaFolla(strada(), {
      dt: 10,
      quartiere: 'centro',
      posGiocatore: CENTRO,
      calpestabile: () => false,
      caso: dadi([0]),
    })

    expect(dopo.nemici).toHaveLength(0)
  })

  it('chi si allontana troppo viene dimenticato', () => {
    const pieno = conFolla(20)
    const lontano = aggiornaFolla(pieno, {
      dt: 0,
      quartiere: 'centro',
      posGiocatore: { x: 200, y: 200 },
      calpestabile: () => true,
      caso: dadi([1]),
    })

    expect(lontano.nemici).toHaveLength(0)
  })

  it('non tocca chi è venuto a cercarti', () => {
    const conPoliziotti: Scontro = {
      ...strada(),
      nemici: [
        {
          id: 1,
          tipo: 'poliziotto',
          pos: { x: 300, y: 300 },
          vita: 55,
          vitaMax: 55,
          arma: 'pistola',
          ricarica: 0,
        },
      ],
    }

    const dopo = aggiornaFolla(conPoliziotti, {
      dt: 0,
      quartiere: 'centro',
      posGiocatore: CENTRO,
      calpestabile: () => true,
      caso: dadi([1]),
    })

    expect(dopo.nemici).toHaveLength(1)
  })
})

describe('la strada', () => {
  it('non si vince: resta in corso anche senza nessuno attorno', () => {
    const dopo = avanza(strada(), 1, FERMO)
    expect(dopo.scontro.esito).toBe('in-corso')
  })

  it('i passanti camminano per i fatti loro', () => {
    const s = conFolla(10)
    const prima = s.nemici[0].pos
    const dopo = avanza(s, 1, FERMO).scontro.nemici.find((n) => n.id === s.nemici[0].id)!

    expect(dopo.pos).not.toEqual(prima)
  })

  it('ma ci si può morire lo stesso', () => {
    const ferito: Scontro = {
      ...strada(),
      giocatore: { ...strada().giocatore, vita: 0 },
    }
    expect(avanza(ferito, 0.1, FERMO).scontro.esito).toBe('perso')
  })
})
