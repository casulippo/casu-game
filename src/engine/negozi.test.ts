import { describe, expect, it } from 'vitest'
import {
  RISPETTO_PER_LA_MAFIA,
  acquistaDallaMafia,
  armiInVendita,
  drogheDallaMafia,
  grammiDallaMafia,
  laMafiaTiConsidera,
  parlaConLaMafia,
  compraArma,
  compraStrumento,
  impugna,
  prezzoArmeria,
  sbloccaArma,
  strumentiInVendita,
  unFavoreAllArmiere,
} from './negozi'
import { armaPerId } from './armi'
import { acquistaAlBazar } from './droga'
import { strumentoPerId } from './strumenti'
import { statisticheEffettive } from './statistiche'
import { statoIniziale, type GameState } from './state'

function stato(modifiche: Partial<GameState> = {}): GameState {
  return { ...statoIniziale(), ...modifiche }
}

function conSoldi(contante: number, resto: Partial<GameState> = {}): GameState {
  const base = stato(resto)
  return { ...base, giocatore: { ...base.giocatore, contante } }
}

describe('l armeria', () => {
  it('all inizio tiene solo la pistola: il resto se lo guadagna', () => {
    expect(armiInVendita(stato()).map((a) => a.id)).toEqual(['pistola'])
  })

  it('coi favori tira fuori roba migliore', () => {
    let s = stato()
    for (let i = 0; i < 4; i++) s = unFavoreAllArmiere(s)

    expect(armiInVendita(s).map((a) => a.id)).toContain('mitraglietta')
    expect(armiInVendita(s).map((a) => a.id)).toContain('fucile')
  })

  it('più la zona è tranquilla, meno si paga', () => {
    const nuovo = stato()
    const amico = unFavoreAllArmiere(unFavoreAllArmiere(nuovo))

    expect(prezzoArmeria(nuovo, 'pistola')).toBe(armaPerId('pistola').prezzo)
    expect(prezzoArmeria(amico, 'pistola')).toBeLessThan(prezzoArmeria(nuovo, 'pistola'))
  })

  it('lo sconto non arriva a regalarti l armamentario', () => {
    let s = stato()
    for (let i = 0; i < 20; i++) s = unFavoreAllArmiere(s)

    expect(prezzoArmeria(s, 'pistola')).toBeGreaterThanOrEqual(
      armaPerId('pistola').prezzo * 0.6,
    )
  })

  it('comprare scala il contante e mette l arma in mano', () => {
    const acquisto = compraArma(conSoldi(1_000), 'pistola')

    expect(acquisto.esito).toBe('ok')
    expect(acquisto.spesa).toBe(400)
    expect(acquisto.stato.giocatore.contante).toBe(600)
    expect(acquisto.stato.giocatore.armi).toContain('pistola')
    expect(acquisto.stato.giocatore.arma).toBe('pistola')
  })

  it('senza soldi non si compra niente', () => {
    const povero = conSoldi(10)
    const acquisto = compraArma(povero, 'pistola')

    expect(acquisto.esito).toBe('senza-soldi')
    expect(acquisto.stato).toBe(povero)
  })

  it('quello che non ha, non lo vende', () => {
    expect(compraArma(conSoldi(10_000), 'fucile').esito).toBe('non-disponibile')
  })

  it('non si compra due volte la stessa', () => {
    const armato = compraArma(conSoldi(1_000), 'pistola').stato
    expect(compraArma(armato, 'pistola').esito).toBe('gia-tua')
  })

  it('la pistola del vecchietto è un regalo, non un acquisto', () => {
    const regalata = sbloccaArma(conSoldi(0), 'pistola')

    expect(regalata.giocatore.armi).toContain('pistola')
    expect(regalata.giocatore.contante).toBe(0)
    expect(armiInVendita(regalata).map((a) => a.id)).not.toContain('pistola')
  })

  it('si impugna solo quello che si ha', () => {
    const armato = sbloccaArma(stato(), 'pistola')

    expect(impugna(armato, 'coltello').giocatore.arma).toBe('coltello')
    expect(impugna(armato, 'fucile').giocatore.arma).toBe('pistola')
  })
})

describe('il mercato nero', () => {
  it('vende quello che non hai ancora', () => {
    const conGiubbotto = compraStrumento(conSoldi(5_000), 'giubbotto').stato

    expect(strumentiInVendita(conGiubbotto).map((s) => s.id)).not.toContain('giubbotto')
    expect(compraStrumento(conGiubbotto, 'giubbotto').esito).toBe('gia-tua')
  })

  it('il giubbotto è vita in più quando ti sparano', () => {
    const nudo = conSoldi(5_000)
    const protetto = compraStrumento(nudo, 'giubbotto').stato

    expect(statisticheEffettive(protetto).vita).toBe(
      statisticheEffettive(nudo).vita + strumentoPerId('giubbotto').bonus.vita!,
    )
  })

  it('i bonus si sommano fra strumenti diversi', () => {
    let s = conSoldi(5_000)
    s = compraStrumento(s, 'giubbotto').stato
    s = compraStrumento(s, 'anfibi').stato

    expect(statisticheEffettive(s).vita).toBe(80 + 40 + 10)
  })

  it('senza contante si guarda e basta', () => {
    const povero = conSoldi(10)
    const acquisto = compraStrumento(povero, 'giubbotto')

    expect(acquisto.esito).toBe('senza-soldi')
    expect(acquisto.stato).toBe(povero)
  })

  it('le statistiche base non vengono toccate: il bonus si somma a parte', () => {
    const protetto = compraStrumento(conSoldi(5_000), 'giubbotto').stato
    expect(protetto.giocatore.statistiche.vita).toBe(80)
  })
})

describe('la mafia', () => {
  /** Uno che ha già girato abbastanza soldi da essere preso sul serio. */
  function rispettato(contante = 5_000): GameState {
    const base = conSoldi(contante)
    return {
      ...base,
      giocatore: { ...base.giocatore, incassoTotale: RISPETTO_PER_LA_MAFIA },
    }
  }

  it('non ti considera finché non hai girato abbastanza', () => {
    const ragazzino = conSoldi(100_000)

    expect(laMafiaTiConsidera(ragazzino)).toBe(false)
    expect(parlaConLaMafia(ragazzino)).toBe(ragazzino)
    expect(drogheDallaMafia(ragazzino)).toEqual([])
  })

  it('i soldi in tasca non bastano: serve averli girati', () => {
    const spiantato: GameState = {
      ...conSoldi(0),
      giocatore: { ...conSoldi(0).giocatore, incassoTotale: RISPETTO_PER_LA_MAFIA },
    }
    expect(laMafiaTiConsidera(spiantato)).toBe(true)
  })

  it('dopo due parole tira fuori la roba pesante', () => {
    const contatto = parlaConLaMafia(rispettato())

    expect(contatto.mafia.contatto).toBe(true)
    expect(drogheDallaMafia(contatto).map((d) => d.id)).toEqual([
      'cocaina',
      'crack',
      'eroina',
    ])
  })

  it('la roba pesante non passa dal bazar nemmeno adesso', () => {
    const contatto = parlaConLaMafia(rispettato())
    expect(acquistaAlBazar(contatto, 'cocaina', 10).motivo).toBe('non-disponibile')
  })

  it('comprare scala il contante e consegna i grammi', () => {
    const contatto = parlaConLaMafia(rispettato(1_000))
    const acquisto = acquistaDallaMafia(contatto, 'cocaina', 10)

    expect(acquisto.motivo).toBe('ok')
    expect(acquisto.grammi).toBe(10)
    expect(acquisto.spesa).toBe(450)
    expect(acquisto.stato.giocatore.contante).toBe(550)
    expect(acquisto.stato.giocatore.roba.cocaina).toBe(10)
  })

  it('senza contatto non si compra niente, per quanti soldi si abbia', () => {
    expect(acquistaDallaMafia(rispettato(100_000), 'eroina', 5).motivo).toBe(
      'non-disponibile',
    )
  })

  it('loro non hanno tetto: il limite è solo la tasca', () => {
    const contatto = parlaConLaMafia(rispettato(4_500))

    expect(grammiDallaMafia(contatto, 'cocaina')).toBe(100)
    expect(acquistaDallaMafia(contatto, 'cocaina', 999).grammi).toBe(100)
  })

  it('promette solo quello che l acquisto poi mantiene', () => {
    const contatto = parlaConLaMafia(rispettato(137))
    const promessi = grammiDallaMafia(contatto, 'crack')

    expect(acquistaDallaMafia(contatto, 'crack', 999).grammi).toBe(promessi)
  })
})
