import { describe, expect, it } from 'vitest'
import {
  CALORE,
  CALORE_MASSIMO,
  agentiDelRaid,
  arresto,
  chiudiScontro,
  combatti,
  conCalore,
  conRaid,
  forseUnRaid,
  livelloRicerca,
  probabilitaDiEssereNotato,
  probabilitaDiRaid,
  raffredda,
  vistiVendere,
} from './polizia'
import { deposito, nascondiContante, nascondigli } from './nascondigli'
import { rischioVendita } from './spaccio'
import { statoIniziale, type GameState } from './state'

const CASA = { x: 68, y: 66 }

function stato(calore = 0, modifiche: Partial<GameState> = {}): GameState {
  return { ...statoIniziale(), polizia: { calore }, ...modifiche }
}

describe('livello di ricerca', () => {
  it('a mani pulite non ti cerca nessuno', () => {
    expect(livelloRicerca(stato(0))).toBe(0)
  })

  it('sale per soglie, fino a quattro', () => {
    expect(livelloRicerca(stato(10))).toBe(1)
    expect(livelloRicerca(stato(49))).toBe(2)
    expect(livelloRicerca(stato(75))).toBe(4)
    expect(livelloRicerca(stato(CALORE_MASSIMO))).toBe(4)
  })

  it('il calore non sfora né sotto né sopra', () => {
    expect(conCalore(stato(0), -50).polizia.calore).toBe(0)
    expect(conCalore(stato(90), 999).polizia.calore).toBe(CALORE_MASSIMO)
  })
})

describe('come ci si scalda', () => {
  it('vendere dove c è polizia si fa notare più che dove non ce n è', () => {
    expect(probabilitaDiEssereNotato(rischioVendita('marijuana', 'centro'))).toBeGreaterThan(
      probabilitaDiEssereNotato(rischioVendita('marijuana', 'bandelle')),
    )
  })

  it('una vendita vista alza il calore, una passata liscia no', () => {
    const rischio = rischioVendita('marijuana', 'centro')
    expect(vistiVendere(stato(0), rischio, 0).polizia.calore).toBe(CALORE.venditaNotata)
    expect(vistiVendere(stato(0), rischio, 0.99).polizia.calore).toBe(0)
  })

  it('il tempo tranquillo raffredda', () => {
    expect(raffredda(stato(40), 8).polizia.calore).toBeLessThan(40)
    expect(raffredda(stato(4), 8).polizia.calore).toBe(0)
  })
})

describe('i raid', () => {
  it('a ricerca zero non parte niente, per quanto vada male il tiro', () => {
    expect(probabilitaDiRaid(stato(0))).toBe(0)
    expect(forseUnRaid(stato(0), CASA, 0).scontro).toBeNull()
  })

  it('più ti cercano, più agenti mandano', () => {
    expect(agentiDelRaid(stato(10))).toBe(2)
    expect(agentiDelRaid(stato(80))).toBeGreaterThan(agentiDelRaid(stato(10)))
  })

  it('scatta col tiro giusto, e gli agenti nascono attorno a te', () => {
    const dopo = forseUnRaid(stato(80), CASA, 0)
    const scontro = dopo.scontro!

    expect(scontro.nemici).toHaveLength(agentiDelRaid(stato(80)))
    expect(scontro.giocatore.pos).toEqual(CASA)
    for (const agente of scontro.nemici) {
      const distanza = Math.hypot(agente.pos.x - CASA.x, agente.pos.y - CASA.y)
      expect(distanza).toBeCloseTo(10)
    }
  })

  it('non se ne accavallano due', () => {
    const inCorso = conRaid(stato(80), CASA, 3)
    expect(forseUnRaid(inCorso, CASA, 0).scontro).toBe(inCorso.scontro)
  })
})

describe('come finisce un raid', () => {
  it('scamparlo raffredda le acque', () => {
    const dopo = chiudiScontro(conRaid(stato(60), CASA, 3), 'scampato')
    expect(dopo.scontro).toBeNull()
    expect(dopo.polizia.calore).toBe(60 + CALORE.raidScampato)
  })

  it('vincerlo lascia agenti a terra, e si paga', () => {
    const dopo = chiudiScontro(conRaid(stato(60), CASA, 3), 'vinto')
    expect(dopo.polizia.calore).toBeGreaterThan(60)
  })

  it('perderlo è un arresto', () => {
    const pieno: GameState = {
      ...stato(60),
      giocatore: {
        ...statoIniziale().giocatore,
        contante: 800,
        soldiNascosti: 400,
        roba: { marijuana: 50 },
      },
    }

    const dopo = chiudiScontro(conRaid(pieno, CASA, 3), 'perso')

    expect(dopo.giocatore.contante).toBe(0)
    expect(dopo.giocatore.soldiNascosti).toBe(0)
    expect(dopo.giocatore.roba).toEqual({})
    expect(dopo.polizia.calore).toBe(0)
  })
})

describe('arresto', () => {
  it('non tocca quello che è nascosto in giro', () => {
    const conGruzzolo = nascondiContante(
      { ...stato(0), giocatore: { ...statoIniziale().giocatore, contante: 500 } },
      nascondigli()[0].id,
      300,
    )

    const dopo = arresto(conGruzzolo)
    expect(deposito(dopo, nascondigli()[0].id).soldi).toBe(300)
  })

  it('si esce di cella il mattino dopo, con le ossa rotte', () => {
    const notte: GameState = { ...stato(0), tempo: { giorno: 3, ora: 23, minuto: 0 } }
    const dopo = arresto(notte)

    expect(dopo.tempo.ora).toBe(8)
    expect(dopo.tempo.giorno).toBe(4)
    expect(dopo.sonno.debito).toBeGreaterThan(notte.sonno.debito)
  })

  it('il livello resta: quello lo si è raggiunto', () => {
    const cresciuto: GameState = {
      ...stato(0),
      giocatore: { ...statoIniziale().giocatore, livello: 4, incassoTotale: 20_000 },
    }

    const dopo = arresto(cresciuto)
    expect(dopo.giocatore.livello).toBe(4)
    expect(dopo.giocatore.incassoTotale).toBe(20_000)
  })
})

describe('combatti', () => {
  const addosso: GameState = {
    ...stato(0),
    scontro: conRaid(stato(0), CASA, 1).scontro,
  }

  it('senza scontro in corso non fa niente', () => {
    const tranquillo = stato(0)
    expect(combatti(tranquillo, 1 / 60, { direzione: { x: 0, y: 0 }, mira: null, spara: false })).toBe(
      tranquillo,
    )
  })

  it('fa avanzare lo scontro', () => {
    const dopo = combatti(addosso, 1 / 60, {
      direzione: { x: 1, y: 0 },
      mira: null,
      spara: false,
    })

    expect(dopo.scontro!.tempo).toBeGreaterThan(0)
    expect(dopo.scontro!.giocatore.pos.x).toBeGreaterThan(CASA.x)
  })

  it('abbattere un passante brucia clienti e scalda la polizia', () => {
    const conPassante = conRaid(stato(0), CASA, 1)
    conPassante.scontro!.nemici.push({
      id: 99,
      tipo: 'passante',
      pos: { x: CASA.x, y: CASA.y + 1 },
      vita: 25,
      vitaMax: 25,
      arma: 'coltello',
      ricarica: 0,
    })

    const dopo = combatti(conPassante, 1 / 60, {
      direzione: { x: 0, y: 0 },
      mira: { x: 0, y: 1 },
      spara: true,
    })

    expect(dopo.mercato.quotaClienti).toBe(0.7)
    expect(dopo.polizia.calore).toBe(CALORE.passanteColpito)
  })
})
