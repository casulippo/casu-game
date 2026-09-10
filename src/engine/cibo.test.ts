import { describe, expect, it } from 'vitest'
import {
  MASSIMO_STATISTICA,
  compraCibo,
  conBonusDelPasto,
  frigoPieno,
  prendiDalFrigo,
  quantoNeResta,
} from './cibo'
import { mangia } from './azioniCasa'
import { statoIniziale, type GameState } from './state'

function stato(modifiche: Partial<GameState> = {}): GameState {
  return { ...statoIniziale(), ...modifiche }
}

function conSoldi(contante: number): GameState {
  const base = stato()
  return { ...base, giocatore: { ...base.giocatore, contante } }
}

describe('la spesa', () => {
  it('quello che si compra finisce in frigo, non in tasca', () => {
    const spesa = compraCibo(conSoldi(100), 'carne', 3)

    expect(spesa.quantita).toBe(3)
    expect(spesa.spesa).toBe(27)
    expect(spesa.stato.giocatore.contante).toBe(73)
    expect(quantoNeResta(spesa.stato, 'carne')).toBe(3)
  })

  it('si compra quel che il contante permette', () => {
    const spesa = compraCibo(conSoldi(10), 'carne', 5)
    expect(spesa.quantita).toBe(1)
  })

  it('con le tasche vuote il frigo resta com era', () => {
    const povero = conSoldi(0)
    expect(compraCibo(povero, 'pasta', 2).stato).toBe(povero)
  })
})

describe('il frigo', () => {
  it('si comincia con due panini e niente più', () => {
    expect(frigoPieno(stato())).toBe(2)
  })

  it('una porzione presa è una porzione in meno', () => {
    const dopo = prendiDalFrigo(stato(), 'panino')!
    expect(quantoNeResta(dopo, 'panino')).toBe(1)
  })

  it('finito un cibo, la voce sparisce invece di restare a zero', () => {
    let s: GameState = stato()
    s = prendiDalFrigo(s, 'panino')!
    s = prendiDalFrigo(s, 'panino')!

    expect('panino' in s.frigo).toBe(false)
    expect(prendiDalFrigo(s, 'panino')).toBeNull()
  })
})

describe('mangiare', () => {
  it('col frigo vuoto non succede niente: è lui a dire di fare la spesa', () => {
    const vuoto = stato({ frigo: {} })
    expect(mangia(vuoto)).toBe(vuoto)
  })

  it('senza scegliere si prende quello che c è', () => {
    const dopo = mangia(stato({ fame: { livello: 60 } }))
    expect(dopo.fame.livello).toBe(35)
    expect(frigoPieno(dopo)).toBe(1)
  })

  it('mangiare bene rimette in sesto, il panino riempie e basta', () => {
    const conCarne = compraCibo(conSoldi(100), 'carne', 1).stato

    const dopoCarne = mangia(conCarne, 'carne')
    const dopoPanino = mangia(conCarne, 'panino')

    expect(dopoCarne.giocatore.statistiche.vita).toBeGreaterThan(
      conCarne.giocatore.statistiche.vita,
    )
    expect(dopoPanino.giocatore.statistiche.vita).toBe(
      conCarne.giocatore.statistiche.vita,
    )
  })

  it('non si sceglie un cibo che non c è', () => {
    const senzaCarne = stato()
    expect(mangia(senzaCarne, 'carne')).toBe(senzaCarne)
  })
})

describe('i bonus del pasto', () => {
  it('non sfondano il tetto della statistica', () => {
    const gia = { mira: 99, vita: 100, socialita: 50, bellezza: 99 }
    const dopo = conBonusDelPasto(gia, 'integratori')

    expect(dopo.mira).toBe(MASSIMO_STATISTICA)
    expect(dopo.bellezza).toBe(MASSIMO_STATISTICA)
  })

  it('lasciano stare quello che il cibo non tocca', () => {
    const prima = { mira: 30, vita: 100, socialita: 40, bellezza: 40 }
    expect(conBonusDelPasto(prima, 'pasta').socialita).toBe(40)
  })
})
