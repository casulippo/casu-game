import { describe, expect, it } from 'vitest'
import {
  RAGGIO_NASCONDIGLIO,
  deposito,
  nascondiContante,
  nascondiRoba,
  nascondigli,
  nascondiglioAllaPortata,
  nascondigliUsati,
  perdiTutto,
  puoUsare,
  riprendiContante,
  riprendiRoba,
} from './nascondigli'
import { calpestabile, generaCitta } from './city'
import { nascondigliAttivi } from './livello'
import { quartiereIn } from './quartieri'
import { statoIniziale, type GameState } from './state'

const posti = nascondigli()
const mappa = generaCitta()

function conRoba(modifiche: Partial<GameState['giocatore']> = {}): GameState {
  const base = statoIniziale()
  return {
    ...base,
    giocatore: {
      ...base.giocatore,
      contante: 500,
      roba: { marijuana: 40 },
      ...modifiche,
    },
  }
}

describe('i posti in città', () => {
  it('sono più di cinquanta, come dice il design', () => {
    expect(posti.length).toBeGreaterThan(50)
  })

  it('stanno tutti dove si cammina: a un nascondiglio si deve arrivare', () => {
    for (const posto of posti) {
      expect(calpestabile(mappa, posto.cella.x, posto.cella.y)).toBe(true)
    }
  })

  it('hanno id distinti', () => {
    expect(new Set(posti.map((p) => p.id)).size).toBe(posti.length)
  })

  it('sono sparsi su tutti i quartieri, non ammassati in centro', () => {
    const zone = new Set(posti.map((p) => quartiereIn(p.cella.x, p.cella.y).id))
    expect(zone.size).toBe(6)
  })
})

describe('nascondiglioAllaPortata', () => {
  it('risponde da sopra la cella', () => {
    const posto = posti[0]
    const sopra = { x: posto.cella.x + 0.5, y: posto.cella.y + 0.5 }
    expect(nascondiglioAllaPortata(sopra)?.id).toBe(posto.id)
  })

  it('non risponde da lontano', () => {
    const posto = posti[0]
    const lontano = {
      x: posto.cella.x + RAGGIO_NASCONDIGLIO + 2,
      y: posto.cella.y,
    }
    expect(nascondiglioAllaPortata(lontano)).toBeNull()
  })
})

describe('mettere e riprendere', () => {
  const id = posti[0].id

  it('il contante esce dalla tasca ed entra nel nascondiglio', () => {
    const dopo = nascondiContante(conRoba(), id, 200)

    expect(dopo.giocatore.contante).toBe(300)
    expect(deposito(dopo, id).soldi).toBe(200)
  })

  it('riprendendolo torna in tasca, e il posto si libera', () => {
    const pieno = nascondiContante(conRoba(), id, 200)
    const vuoto = riprendiContante(pieno, id, 200)

    expect(vuoto.giocatore.contante).toBe(500)
    expect(nascondigliUsati(vuoto)).toBe(0)
    expect(id in vuoto.nascondigli).toBe(false)
  })

  it('non mette via più di quanto si abbia', () => {
    const dopo = nascondiContante(conRoba({ contante: 30 }), id, 999)
    expect(deposito(dopo, id).soldi).toBe(30)
    expect(dopo.giocatore.contante).toBe(0)
  })

  it('la roba si nasconde e si riprende al grammo', () => {
    const messa = nascondiRoba(conRoba(), id, 'marijuana', 25)
    expect(messa.giocatore.roba.marijuana).toBe(15)
    expect(deposito(messa, id).roba.marijuana).toBe(25)

    const ripresa = riprendiRoba(messa, id, 'marijuana', 10)
    expect(ripresa.giocatore.roba.marijuana).toBe(25)
    expect(deposito(ripresa, id).roba.marijuana).toBe(15)
  })

  it('non si prende quello che non c è', () => {
    const stato = conRoba()
    expect(riprendiContante(stato, id, 50)).toBe(stato)
    expect(riprendiRoba(stato, id, 'marijuana', 5)).toBe(stato)
  })
})

describe('il limite di livello', () => {
  it('al livello 1 se ne tengono due, il terzo rifiuta', () => {
    let stato = conRoba()
    expect(nascondigliAttivi(stato.giocatore.livello)).toBe(2)

    stato = nascondiContante(stato, posti[0].id, 50)
    stato = nascondiContante(stato, posti[1].id, 50)
    const terzo = nascondiContante(stato, posti[2].id, 50)

    expect(nascondigliUsati(stato)).toBe(2)
    expect(terzo).toBe(stato)
    expect(puoUsare(stato, posti[2].id)).toBe(false)
  })

  it('uno già rifornito si può sempre rimpinguare', () => {
    let stato = conRoba()
    stato = nascondiContante(stato, posti[0].id, 50)
    stato = nascondiContante(stato, posti[1].id, 50)

    const ancora = nascondiContante(stato, posti[0].id, 100)
    expect(deposito(ancora, posti[0].id).soldi).toBe(150)
  })

  it('svuotandone uno si libera il posto per un altro', () => {
    let stato = conRoba()
    stato = nascondiContante(stato, posti[0].id, 50)
    stato = nascondiContante(stato, posti[1].id, 50)
    stato = riprendiContante(stato, posti[0].id, 50)

    expect(puoUsare(stato, posti[2].id)).toBe(true)
  })

  it('con più livelli se ne tengono di più', () => {
    const cresciuto = conRoba()
    cresciuto.giocatore.livello = 4

    let stato: GameState = cresciuto
    for (let i = 0; i < 5; i++) stato = nascondiContante(stato, posti[i].id, 10)

    expect(nascondigliUsati(stato)).toBe(5)
  })
})

describe('perdere tutto', () => {
  it('un arresto porta via tasca, casa e roba addosso', () => {
    const stato = conRoba({ soldiNascosti: 300 })
    const dopo = perdiTutto(stato)

    expect(dopo.giocatore.contante).toBe(0)
    expect(dopo.giocatore.soldiNascosti).toBe(0)
    expect(dopo.giocatore.roba).toEqual({})
  })

  it('quello che è nascosto in giro non lo tocca nessuno', () => {
    let stato = conRoba()
    stato = nascondiContante(stato, posti[0].id, 200)
    stato = nascondiRoba(stato, posti[0].id, 'marijuana', 30)

    const dopo = perdiTutto(stato)
    expect(deposito(dopo, posti[0].id).soldi).toBe(200)
    expect(deposito(dopo, posti[0].id).roba.marijuana).toBe(30)
  })

  it('il livello resta: è una soglia raggiunta, non un saldo', () => {
    const stato = conRoba()
    stato.giocatore.livello = 3
    expect(perdiTutto(stato).giocatore.livello).toBe(3)
  })
})
