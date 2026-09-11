import { describe, expect, it } from 'vitest'
import { interazioneInCitta, stessaInterazione } from './interazione'
import { luogoPerId } from './luoghi'

const casa = luogoPerId('casa')
const supermercato = luogoPerId('supermercato')

const sullaPorta = (l: typeof casa) => ({
  x: l.porta.x + 0.5,
  y: l.porta.y + 0.5,
})

describe('interazioneInCitta', () => {
  it('offre di entrare davanti a un luogo aperto', () => {
    const azione = interazioneInCitta(sullaPorta(casa))
    expect(azione).toEqual({ tipo: 'entra', luogo: casa })
  })

  it('segnala il blocco davanti a un luogo chiuso, invece di tacere', () => {
    const azione = interazioneInCitta(sullaPorta(supermercato))
    expect(azione?.tipo).toBe('bloccato')
  })

  it('non offre niente in mezzo alla strada', () => {
    expect(interazioneInCitta({ x: 2.5, y: 10.5 })).toBeNull()
  })
})

describe('stessaInterazione', () => {
  it('riconosce due volte la stessa porta', () => {
    const a = interazioneInCitta(sullaPorta(casa))
    const b = interazioneInCitta(sullaPorta(casa))
    expect(stessaInterazione(a, b)).toBe(true)
  })

  it('distingue porte diverse', () => {
    const a = interazioneInCitta(sullaPorta(casa))
    const b = interazioneInCitta(sullaPorta(supermercato))
    expect(stessaInterazione(a, b)).toBe(false)
  })

  it('distingue niente da qualcosa', () => {
    const a = interazioneInCitta(sullaPorta(casa))
    expect(stessaInterazione(a, null)).toBe(false)
    expect(stessaInterazione(null, null)).toBe(true)
  })

  it('distingue uscire dall entrare', () => {
    const entra = interazioneInCitta(sullaPorta(casa))
    expect(stessaInterazione(entra, { tipo: 'esci' })).toBe(false)
  })
})

/**
 * Regressione: uscendo di casa la pagina diventava bianca.
 *
 * La scena dell'interno continua a girare per qualche frame dopo che lo store è
 * già passato all'esterno, e in quella finestra segnalava ancora "sono
 * sull'uscita". La UI, vedendosi in città, cercava un luogo di nome "uscita" e
 * l'app crashava. Col tipo discriminato l'uscita non è più confondibile con un
 * luogo, e il caso è rappresentabile senza ambiguità.
 */
describe('uscita e luoghi non si confondono', () => {
  it('l uscita non porta con se nessun luogo da cercare', () => {
    const uscita = { tipo: 'esci' } as const
    expect('luogo' in uscita).toBe(false)
  })

  it('entrare porta sempre un luogo completo, mai un identificativo sciolto', () => {
    const azione = interazioneInCitta(sullaPorta(casa))
    expect(azione?.tipo).toBe('entra')
    if (azione?.tipo === 'entra') {
      expect(azione.luogo.nome).toBeTruthy()
      expect(azione.luogo.id).toBe('casa')
    }
  })
})

describe('parlare con chi si muove', () => {
  const armiere = { id: 'armiere', nome: 'Armiere', sprite: 'armiere' as const, verso: 'fronte' as const, x: 18, y: 22 }

  it('risponde dove la persona si trova adesso', () => {
    const passeggiato = [{ ...armiere, x: 30, y: 40 }]
    const azione = interazioneInCitta({ x: 30.5, y: 40.5 }, [], passeggiato)

    expect(azione).toEqual({ tipo: 'parla', npc: passeggiato[0] })
  })

  it('non risponde dal punto in cui la persona è nata', () => {
    const passeggiato = [{ ...armiere, x: 30, y: 40 }]
    expect(interazioneInCitta({ x: 18.5, y: 22.5 }, [], passeggiato)).toBeNull()
  })
})
