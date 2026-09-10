import { describe, expect, it } from 'vitest'
import {
  VELOCITA_VAGABONDAGGIO,
  aggiornaNpc,
  statoInizialeNpc,
  type StatoNpc,
} from './npcMovimento'
import type { Cella } from './city'
import type { Npc } from './npc'

/** Una griglia quadrata tutta calpestabile, salvo le celle indicate. */
function mappaDi(lato: number, bloccate: string[] = []): Cella[][] {
  const set = new Set(bloccate)
  const mappa: Cella[][] = []
  for (let y = 0; y < lato; y++) {
    const riga: Cella[] = []
    for (let x = 0; x < lato; x++) riga.push(set.has(`${x},${y}`) ? 'edificio' : 'erba')
    mappa.push(riga)
  }
  return mappa
}

function npcDi(x: number, y: number, raggio?: number): Npc {
  return { id: 'test', nome: 'Test', sprite: 'venditore', x, y, verso: 'fronte', raggio }
}

/** rng che restituisce sempre lo stesso valore: sceglie sempre lo stesso candidato. */
function rngFisso(valore: number): () => number {
  return () => valore
}

describe('statoInizialeNpc', () => {
  it('parte fermo, al centro della cella di origine', () => {
    const stato = statoInizialeNpc(npcDi(5, 5), rngFisso(0))
    expect(stato.pos).toEqual({ x: 5.5, y: 5.5 })
    expect(stato.destinazione).toBeNull()
  })

  it('sfalsa l attesa iniziale secondo l rng: NPC diversi non partono insieme', () => {
    const a = statoInizialeNpc(npcDi(0, 0), rngFisso(0))
    const b = statoInizialeNpc(npcDi(0, 0), rngFisso(1))
    expect(a.attesa).not.toBe(b.attesa)
  })
})

describe('aggiornaNpc — fase di attesa', () => {
  it('scandisce l attesa senza muoversi', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    const stato: StatoNpc = { pos: { x: 5.5, y: 5.5 }, destinazione: null, attesa: 2, provenienza: null }

    const dopo = aggiornaNpc(npc, stato, mappa, 0.5, rngFisso(0))
    expect(dopo.attesa).toBeCloseTo(1.5)
    expect(dopo.pos).toEqual(stato.pos)
    expect(dopo.destinazione).toBeNull()
  })

  it('scelta la destinazione quando l attesa scade', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    const stato: StatoNpc = { pos: { x: 5.5, y: 5.5 }, destinazione: null, attesa: 0.1, provenienza: null }

    const dopo = aggiornaNpc(npc, stato, mappa, 0.5, rngFisso(0))
    expect(dopo.destinazione).not.toBeNull()
  })

  it('non sceglie mai una cella non calpestabile', () => {
    // Tre lati murati: l unica via è a destra.
    const mappa = mappaDi(10, ['4,5', '5,4', '5,6'])
    const npc = npcDi(5, 5)
    const stato: StatoNpc = { pos: { x: 5.5, y: 5.5 }, destinazione: null, attesa: 0, provenienza: null }

    for (const valore of [0, 0.3, 0.6, 0.99]) {
      const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(valore))
      expect(dopo.destinazione).toEqual({ x: 6.5, y: 5.5 })
    }
  })

  it('resta fermo se non c e nessuna cella calpestabile vicino', () => {
    const mappa = mappaDi(10, ['4,5', '6,5', '5,4', '5,6'])
    const npc = npcDi(5, 5)
    const stato: StatoNpc = { pos: { x: 5.5, y: 5.5 }, destinazione: null, attesa: 0, provenienza: null }

    const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(0))
    expect(dopo.destinazione).toBeNull()
    expect(dopo.attesa).toBeGreaterThan(0)
  })

  it('non propone mai una cella fuori dal proprio raggio di giro', () => {
    // Raggio 1: da (5,5) solo le quattro celle adiacenti sono ammesse, e lo
    // sono tutte — ma nessuna oltre.
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5, 1)
    const stato: StatoNpc = { pos: { x: 5.5, y: 5.5 }, destinazione: null, attesa: 0, provenienza: null }

    for (const valore of [0, 0.25, 0.5, 0.75, 0.99]) {
      const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(valore))
      const d = dopo.destinazione!
      expect(Math.hypot(d.x - 0.5 - npc.x, d.y - 0.5 - npc.y)).toBeLessThanOrEqual(1)
    }
  })
})

describe('aggiornaNpc — fase di cammino', () => {
  it('si avvicina alla destinazione alla velocità dichiarata', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: { x: 8.5, y: 5.5 },
      attesa: 0,
      provenienza: null,
    }

    const dopo = aggiornaNpc(npc, stato, mappa, 1, rngFisso(0))
    expect(dopo.pos.x).toBeCloseTo(5.5 + VELOCITA_VAGABONDAGGIO)
    expect(dopo.pos.y).toBeCloseTo(5.5)
    expect(dopo.destinazione).toEqual(stato.destinazione)
  })

  it('arriva esattamente alla destinazione, senza superarla', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: { x: 5.6, y: 5.5 },
      attesa: 0,
      provenienza: null,
    }

    // Un passo di un secondo intero è più lungo della distanza residua.
    const dopo = aggiornaNpc(npc, stato, mappa, 1, rngFisso(0))
    expect(dopo.pos).toEqual({ x: 5.6, y: 5.5 })
    expect(dopo.destinazione).toBeNull()
  })

  it('dopo l arrivo torna in attesa, non riparte subito', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: { x: 5.5, y: 5.5 },
      attesa: 0,
      provenienza: null,
    }

    const dopo = aggiornaNpc(npc, stato, mappa, 0.1, rngFisso(0))
    expect(dopo.destinazione).toBeNull()
    expect(dopo.attesa).toBeGreaterThan(0)
  })
})

/**
 * Il difetto che l'ha fatto notare: su un marciapiede stretto, dove l'unica
 * scelta reale è avanti o indietro, una scelta equiprobabile tra le due fa
 * tornare l'NPC sui propri passi quasi a ogni giro — sembra cammini
 * all'indietro invece di andare in giro.
 */
describe('non torna subito sui propri passi', () => {
  it('non ripropone mai la provenienza se c è un altra cella libera', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    // È appena arrivato da sinistra: la provenienza è (4,5).
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: null,
      attesa: 0,
      provenienza: { x: 4, y: 5 },
    }

    for (const valore of [0, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(valore))
      expect(dopo.destinazione).not.toEqual({ x: 4.5, y: 5.5 })
    }
  })

  it('in un corridoio stretto prosegue dritto invece di ballare avanti e indietro', () => {
    // Un corridoio largo una cella: solo destra e sinistra sono libere.
    const mappa = mappaDi(10, ['5,4', '5,6', '6,4', '6,6', '4,4', '4,6'])
    const npc = npcDi(5, 5)
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: null,
      attesa: 0,
      provenienza: { x: 4, y: 5 },
    }

    // Arrivato da sinistra, con destra libera: prosegue a destra qualunque
    // sia l'estrazione, invece di tornare a sinistra al 50% dei casi.
    for (const valore of [0, 0.3, 0.7, 0.99]) {
      const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(valore))
      expect(dopo.destinazione).toEqual({ x: 6.5, y: 5.5 })
    }
  })

  it('torna indietro quando è l unica via, invece di restare bloccato', () => {
    // Vicolo cieco: solo la provenienza è calpestabile.
    const mappa = mappaDi(10, ['6,5', '5,4', '5,6'])
    const npc = npcDi(5, 5)
    const stato: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: null,
      attesa: 0,
      provenienza: { x: 4, y: 5 },
    }

    const dopo = aggiornaNpc(npc, stato, mappa, 0.001, rngFisso(0))
    expect(dopo.destinazione).toEqual({ x: 4.5, y: 5.5 })
  })

  it('la provenienza si aggiorna: dopo la svolta evita l ultima cella, non la prima', () => {
    const mappa = mappaDi(10)
    const npc = npcDi(5, 5)
    // Fermo in (5,5), è arrivato da (5,4): la prossima mossa non deve tornare
    // lassù, ma da lì in poi la provenienza deve seguirlo.
    const primo: StatoNpc = {
      pos: { x: 5.5, y: 5.5 },
      destinazione: null,
      attesa: 0,
      provenienza: { x: 5, y: 4 },
    }

    const scelta = aggiornaNpc(npc, primo, mappa, 0.001, rngFisso(0))
    expect(scelta.provenienza).toEqual({ x: 5, y: 5 })
    expect(scelta.destinazione).not.toEqual({ x: 5.5, y: 4.5 })
  })
})

/**
 * Il test che conta di più: fatto girare a lungo, un NPC non deve mai
 * allontanarsi dal suo posto oltre il raggio dichiarato. È la promessa
 * dell'intero modulo — il venditore resta davanti a casa, non finisce in centro.
 */
describe('un lungo giro non supera mai il raggio', () => {
  it('resta sempre entro il raggio di giro, per centinaia di passi', () => {
    const mappa = mappaDi(30)
    const npc = npcDi(15, 15, 3)

    // Generatore deterministico ma non banale: non produce sempre lo stesso
    // candidato, così il giro esplora davvero i dintorni.
    let seme = 42
    const rng = () => {
      seme = (seme * 1103515245 + 12345) % 2147483648
      return seme / 2147483648
    }

    let stato = statoInizialeNpc(npc, rng)
    for (let i = 0; i < 2000; i++) {
      stato = aggiornaNpc(npc, stato, mappa, 0.1, rng)
      const distanza = Math.hypot(stato.pos.x - 0.5 - npc.x, stato.pos.y - 0.5 - npc.y)
      expect(distanza).toBeLessThanOrEqual(npc.raggio! + 0.01)
    }
  })
})
