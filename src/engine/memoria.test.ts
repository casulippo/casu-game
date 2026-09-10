import { describe, expect, it } from 'vitest'
import {
  PESO,
  atteggiamento,
  comportamento,
  decadi,
  hannoVisto,
  ricorda,
  testimoniInZona,
} from './memoria'
import { laNotteChePassa, propaga } from './gossip'
import { dormi } from './azioniCasa'
import { statoIniziale, type GameState } from './state'

function stato(modifiche: Partial<GameState> = {}): GameState {
  return { ...statoIniziale(), ...modifiche }
}

/** Quante notti servono perché un ricordo scenda sotto una soglia. */
function nottiPerScendereSotto(iniziale: GameState, npcId: string, soglia: number): number {
  let s = iniziale
  for (let notte = 1; notte <= 400; notte++) {
    s = { ...s, ricordi: decadi(s.ricordi) }
    if (Math.abs(atteggiamento(s, npcId)) < soglia) return notte
  }
  return Infinity
}

describe('ricordare', () => {
  it('chi ha visto ricorda il doppio di chi l ha sentito dire', () => {
    const visto = ricorda(stato(), 'armiere', 'pestaggio')
    const sentito = ricorda(stato(), 'armiere', 'pestaggio', false)

    expect(visto.ricordi[0].peso).toBe(PESO.pestaggio)
    expect(sentito.ricordi[0].peso).toBe(PESO.pestaggio / 2)
  })

  it('i fatti brutti sono debito, quelli belli credito', () => {
    expect(atteggiamento(ricorda(stato(), 'capo', 'sparato'), 'capo')).toBeLessThan(0)
    expect(atteggiamento(ricorda(stato(), 'capo', 'salvato'), 'capo')).toBeGreaterThan(0)
  })

  it('ognuno risponde solo di quello che riguarda lui', () => {
    const dopo = ricorda(stato(), 'capo', 'sparato')
    expect(atteggiamento(dopo, 'armiere')).toBe(0)
  })
})

describe('chi ha visto', () => {
  it('sono quelli che stavano in quel quartiere', () => {
    const daiPalazzoni = stato({ quartiereCorrente: 'palazzoni' })
    const fraLeBandelle = stato({ quartiereCorrente: 'bandelle' })

    expect(testimoniInZona(daiPalazzoni)).toEqual(['venditore'])
    expect(testimoniInZona(fraLeBandelle)).toContain('armiere')
  })

  it('una sparatoria se la segnano tutti quelli che erano lì', () => {
    const dopo = hannoVisto(stato({ quartiereCorrente: 'bandelle' }), 'sparato')

    expect(atteggiamento(dopo, 'capo')).toBe(-PESO.sparato)
    expect(atteggiamento(dopo, 'armiere')).toBe(-PESO.sparato)
    expect(atteggiamento(dopo, 'venditore')).toBe(0)
  })
})

describe('come ti guardano', () => {
  it('di partenza sei uno qualunque', () => {
    expect(comportamento(stato(), 'armiere')).toBe('normale')
  })

  it('chi ti ha visto sparare ti evita', () => {
    const dopo = ricorda(stato(), 'armiere', 'sparato')
    expect(comportamento(dopo, 'armiere')).toBe('evita')
  })

  it('una spinta raffredda, non chiude la porta', () => {
    const dopo = ricorda(stato(), 'armiere', 'spinta')
    expect(comportamento(dopo, 'armiere')).toBe('freddo')
  })

  it('chi gli ha salvato la vita è un amico', () => {
    expect(comportamento(ricorda(stato(), 'armiere', 'salvato'), 'armiere')).toBe('amico')
  })
})

describe('il decadimento', () => {
  it('una spinta si perdona molto prima di un pestaggio', () => {
    const spinta = ricorda(stato(), 'armiere', 'spinta')
    const pestaggio = ricorda(stato(), 'armiere', 'pestaggio')

    expect(nottiPerScendereSotto(spinta, 'armiere', 30)).toBeLessThan(
      nottiPerScendereSotto(pestaggio, 'armiere', 30),
    )
  })

  it('una sparatoria resta addosso per centinaia di giorni', () => {
    const sparato = ricorda(stato(), 'capo', 'sparato')
    expect(nottiPerScendereSotto(sparato, 'capo', 30)).toBeGreaterThan(300)
  })

  it('avere salvato qualcuno non si dimentica mai', () => {
    const salvato = ricorda(stato(), 'armiere', 'salvato')
    expect(nottiPerScendereSotto(salvato, 'armiere', 30)).toBe(Infinity)
  })

  it('i ricordi svaniti si buttano invece di restare a peso zero', () => {
    let s = ricorda(stato(), 'armiere', 'spinta')
    for (let i = 0; i < 300; i++) s = { ...s, ricordi: decadi(s.ricordi) }

    expect(s.ricordi).toHaveLength(0)
  })

  it('quello che si è sentito dire svanisce prima di quello che si è visto', () => {
    const visto = ricorda(stato(), 'armiere', 'pestaggio')
    const sentito = ricorda(stato(), 'armiere', 'pestaggio', false)

    expect(nottiPerScendereSotto(sentito, 'armiere', 5)).toBeLessThan(
      nottiPerScendereSotto(visto, 'armiere', 5),
    )
  })
})

describe('il passaparola', () => {
  it('chi ha visto racconta a chi si fida di lui', () => {
    const dopo = ricorda(stato(), 'armiere', 'pestaggio')
    const propagati = propaga(dopo.ricordi, dopo.tempo.giorno)

    expect(propagati.some((r) => r.npcId === 'venditore' && !r.testimoneDiretto)).toBe(true)
  })

  it('il racconto arriva smorzato, mai più forte dell originale', () => {
    const dopo = ricorda(stato(), 'armiere', 'pestaggio')
    const sentito = propaga(dopo.ricordi, dopo.tempo.giorno).find(
      (r) => r.npcId === 'venditore',
    )!

    expect(sentito.peso).toBeLessThan(PESO.pestaggio)
  })

  it('a chi c era non lo si racconta: lui lo sa meglio', () => {
    const dopo = hannoVisto(stato({ quartiereCorrente: 'bandelle' }), 'sparato')
    const propagati = propaga(dopo.ricordi, dopo.tempo.giorno)

    const perIlCapo = propagati.filter((r) => r.npcId === 'capo')
    expect(perIlCapo).toHaveLength(1)
    expect(perIlCapo[0].testimoneDiretto).toBe(true)
  })

  it('le voci vecchie non ricominciano a girare ogni notte', () => {
    const ieri = ricorda(stato(), 'armiere', 'pestaggio')
    const oggi: GameState = { ...ieri, tempo: { ...ieri.tempo, giorno: ieri.tempo.giorno + 1 } }

    expect(propaga(oggi.ricordi, oggi.tempo.giorno)).toHaveLength(1)
  })

  it('la notte fa girare la voce e poi la fa sbiadire', () => {
    const fatto = ricorda(stato(), 'armiere', 'pestaggio')
    const domani = laNotteChePassa(fatto)

    expect(domani.ricordi).toHaveLength(2)
    expect(atteggiamento(domani, 'armiere')).toBeGreaterThan(-PESO.pestaggio)
  })

  it('dormire è il momento in cui il mondo si aggiorna', () => {
    const fatto = ricorda(stato(), 'armiere', 'pestaggio')
    expect(dormi(fatto, 7).ricordi.length).toBeGreaterThan(fatto.ricordi.length)
  })
})
