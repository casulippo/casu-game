import { describe, expect, it } from 'vitest'
import {
  FABBISOGNO_SONNO,
  ORE_PASTO,
  contanteAddosso,
  dormi,
  mangia,
  nascondiSoldi,
  riprendiSoldi,
} from './azioniCasa'
import { statoIniziale, type GameState } from './state'

function stato(modifiche: Partial<GameState> = {}): GameState {
  return { ...statoIniziale(), ...modifiche }
}

describe('dormi', () => {
  it('una notte piena non lascia debito', () => {
    const dopo = dormi(stato(), FABBISOGNO_SONNO)
    expect(dopo.sonno.debito).toBe(0)
  })

  it('smaltisce il debito arretrato dormendo più del fabbisogno', () => {
    const stanco = stato({ sonno: { debito: 5 } })
    const dopo = dormi(stanco, FABBISOGNO_SONNO + 2)
    expect(dopo.sonno.debito).toBe(3)
  })

  /** Il punto del sistema: il debito si accumula, non si azzera dormicchiando. */
  it('accumula: tre notti da quattro ore pesano come una notte in bianco', () => {
    let corto = stato()
    for (let i = 0; i < 3; i++) corto = dormi(corto, 4)

    const inBianco = dormi(stato(), 0)
    expect(corto.sonno.debito).toBe(3 * (FABBISOGNO_SONNO - 4))
    expect(corto.sonno.debito).toBeGreaterThanOrEqual(inBianco.sonno.debito)
  })

  it('non scende mai sotto zero: dormire tanto non mette sonno in avanzo', () => {
    expect(dormi(stato(), 14).sonno.debito).toBe(0)
  })

  it('fa passare il tempo e svegliare affamati', () => {
    const prima = stato()
    const dopo = dormi(prima, FABBISOGNO_SONNO)

    expect(dopo.fame.livello).toBeGreaterThan(prima.fame.livello)
    expect(dopo.tempo).not.toEqual(prima.tempo)
  })
})

describe('mangia', () => {
  it('sazia', () => {
    const affamato = stato({ fame: { livello: 80 } })
    expect(mangia(affamato).fame.livello).toBeLessThan(80)
  })

  it('non fa scendere la fame sotto zero', () => {
    expect(mangia(stato({ fame: { livello: 5 } })).fame.livello).toBe(0)
  })

  it('costa un ora di gioco', () => {
    const prima = stato()
    const dopo = mangia(prima)
    expect(dopo.tempo.ora).toBe((prima.tempo.ora + ORE_PASTO) % 24)
  })

  it('non toglie il sonno arretrato: si mangia, non si riposa', () => {
    const stanco = stato({ sonno: { debito: 4 } })
    expect(mangia(stanco).sonno.debito).toBe(4)
  })
})

describe('nascondiSoldi', () => {
  it('mette via prima lo sporco: è quello che scotta', () => {
    const ricco = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 100, soldiSporchi: 60 },
    })

    const dopo = nascondiSoldi(ricco, 60)
    expect(dopo.giocatore.soldiSporchi).toBe(0)
    expect(dopo.giocatore.soldiPuliti).toBe(100)
    expect(dopo.giocatore.soldiNascosti).toBe(60)
  })

  it('attinge ai puliti solo quando lo sporco è finito', () => {
    const ricco = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 100, soldiSporchi: 20 },
    })

    const dopo = nascondiSoldi(ricco, 50)
    expect(dopo.giocatore.soldiSporchi).toBe(0)
    expect(dopo.giocatore.soldiPuliti).toBe(70)
    expect(dopo.giocatore.soldiNascosti).toBe(50)
  })

  it('non inventa soldi che non ci sono', () => {
    const povero = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 10, soldiSporchi: 0 },
    })

    const dopo = nascondiSoldi(povero, 999)
    expect(dopo.giocatore.soldiNascosti).toBe(10)
    expect(contanteAddosso(dopo)).toBe(0)
  })

  it('lascia lo stato com era se non c è niente da nascondere', () => {
    const spiantato = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 0, soldiSporchi: 0 },
    })

    expect(nascondiSoldi(spiantato, 50)).toBe(spiantato)
  })

  it('conserva il totale: nascondere non è né guadagnare né perdere', () => {
    const prima = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 100, soldiSporchi: 60 },
    })
    const dopo = nascondiSoldi(prima, 90)

    expect(totale(dopo)).toBe(totale(prima))
  })
})

describe('riprendiSoldi', () => {
  it('riporta il contante in tasca, come pulito', () => {
    const conGruzzolo = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 0, soldiNascosti: 80 },
    })

    const dopo = riprendiSoldi(conGruzzolo, 30)
    expect(dopo.giocatore.soldiNascosti).toBe(50)
    expect(dopo.giocatore.soldiPuliti).toBe(30)
  })

  it('non tira fuori più di quanto ce n è', () => {
    const conGruzzolo = stato({
      giocatore: { ...statoIniziale().giocatore, soldiPuliti: 0, soldiNascosti: 40 },
    })

    const dopo = riprendiSoldi(conGruzzolo, 999)
    expect(dopo.giocatore.soldiNascosti).toBe(0)
    expect(dopo.giocatore.soldiPuliti).toBe(40)
  })
})

function totale(stato: GameState): number {
  const g = stato.giocatore
  return g.soldiPuliti + g.soldiSporchi + g.soldiNascosti
}
