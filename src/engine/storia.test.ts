import { describe, expect, it } from 'vitest'
import {
  BANDA_DEL_PARCHETTO,
  INCASSO_PER_IL_RAID,
  INCASSO_PER_SMS,
  OFFERTA_BAZAR,
  compraLOffertaDelBazar,
  controlla,
  forsePrimoRaid,
  obiettivo,
  parchettoRipulito,
  scontroDelParchetto,
  ultimoMessaggio,
  visitaLArmeria,
} from './storia'
import { grammiDi } from './droga'
import { incassa } from './spaccio'
import { statoIniziale, type GameState } from './state'

const PARCHETTO = { x: 15, y: 33 }

/** Il primo atto giocato fino al passo indicato. */
function fino(passo: string): GameState {
  let s = statoIniziale()
  if (passo === 'parchetto') return s

  s = parchettoRipulito(s)
  if (passo === 'armeria') return s

  s = visitaLArmeria(s)
  if (passo === 'sms') return s

  s = controlla(incassa(s, INCASSO_PER_SMS))
  if (passo === 'rifornimento') return s

  s = compraLOffertaDelBazar({
    ...s,
    giocatore: { ...s.giocatore, contante: 100 },
  })
  return s
}

describe('il parchetto', () => {
  it('si comincia da lì, col coltello', () => {
    const s = statoIniziale()
    expect(s.storia.passo).toBe('parchetto')
    expect(s.giocatore.arma).toBe('coltello')
    expect(obiettivo(s)).toContain('parchetto')
  })

  it('sono in quindici, e da questo non si scappa', () => {
    const s = scontroDelParchetto(statoIniziale(), PARCHETTO)

    expect(s.scontro!.nemici).toHaveLength(BANDA_DEL_PARCHETTO)
    expect(s.scontro!.nemici.every((n) => n.tipo === 'banda')).toBe(true)
    expect(s.scontro!.evitabile).toBe(false)
  })

  it('non si rifà una seconda volta', () => {
    const dopo = parchettoRipulito(statoIniziale())
    expect(scontroDelParchetto(dopo, PARCHETTO).scontro).toBeNull()
  })
})

describe('la pistola del vecchietto', () => {
  it('è un regalo, e viene con un favore già fatto', () => {
    const dopo = parchettoRipulito(statoIniziale())

    expect(dopo.giocatore.armi).toContain('pistola')
    expect(dopo.giocatore.arma).toBe('pistola')
    expect(dopo.armeria.favori).toBe(1)
    expect(ultimoMessaggio(dopo)?.mittente).toBe('Armiere')
  })
})

describe('l SMS del bazar', () => {
  it('arriva ai cento euro incassati, non prima', () => {
    const quasi = controlla(incassa(fino('sms'), INCASSO_PER_SMS - 1))
    expect(quasi.storia.passo).toBe('sms')

    const dopo = controlla(incassa(fino('sms'), INCASSO_PER_SMS))
    expect(dopo.storia.passo).toBe('rifornimento')
    expect(ultimoMessaggio(dopo)?.testo).toContain('prezzi speciali')
  })

  it('non arriva due volte', () => {
    const uno = fino('rifornimento')
    const due = controlla(incassa(uno, 500))

    expect(due.storia.messaggi.filter((m) => m.id === 'sms-bazar')).toHaveLength(1)
  })

  it('ai cento euro si è di livello 2', () => {
    expect(fino('rifornimento').giocatore.livello).toBe(2)
  })
})

describe('il rifornimento', () => {
  it('duecento grammi a cento euro', () => {
    const prima = { ...fino('rifornimento') }
    const dopo = compraLOffertaDelBazar({
      ...prima,
      giocatore: { ...prima.giocatore, contante: 100 },
    })

    expect(grammiDi(dopo.giocatore.roba, 'marijuana')).toBe(OFFERTA_BAZAR.grammi)
    expect(dopo.giocatore.contante).toBe(0)
    expect(dopo.storia.passo).toBe('primo-raid')
  })

  it('non intacca il tetto del giorno: è un regalo, non un acquisto al banco', () => {
    const prima = fino('rifornimento')
    const dopo = compraLOffertaDelBazar({
      ...prima,
      giocatore: { ...prima.giocatore, contante: 100 },
    })

    expect(dopo.mercato.grammiPresiOggi).toBe(prima.mercato.grammiPresiOggi)
  })

  it('senza i cento euro in tasca non si compra', () => {
    const spiantato = fino('rifornimento')
    expect(compraLOffertaDelBazar({
      ...spiantato,
      giocatore: { ...spiantato.giocatore, contante: 0 },
    }).storia.passo).toBe('rifornimento')
  })
})

describe('il primo raid', () => {
  it('scatta dopo aver girato altri cento euro', () => {
    const rifornito = fino('primo-raid')

    expect(forsePrimoRaid(rifornito, PARCHETTO).scontro).toBeNull()

    const conIncasso = incassa(rifornito, INCASSO_PER_IL_RAID)
    const dopo = forsePrimoRaid(conIncasso, PARCHETTO)

    expect(dopo.scontro!.nemici.every((n) => n.tipo === 'poliziotto')).toBe(true)
    expect(dopo.storia.passo).toBe('libero')
  })

  it('da questo si scappa: è quello che insegna a scappare', () => {
    const pronto = incassa(fino('primo-raid'), INCASSO_PER_IL_RAID)
    expect(forsePrimoRaid(pronto, PARCHETTO).scontro!.evitabile).toBe(true)
  })

  it('finito il primo atto, l obiettivo è solo fare soldi', () => {
    const pronto = incassa(fino('primo-raid'), INCASSO_PER_IL_RAID)
    expect(obiettivo(forsePrimoRaid(pronto, PARCHETTO))).toContain('soldi')
  })
})
