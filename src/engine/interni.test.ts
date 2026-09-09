import { describe, expect, it } from 'vitest'
import {
  calpestabileInterno,
  cellaUscita,
  celleDelMobile,
  generaInterno,
  ingresso,
  mobileAllaPortata,
  sullUscita,
  type Interno,
} from './interni'
import { CASE } from './case'

const interno = generaInterno()

describe('generaInterno', () => {
  it('produce una pianta rettangolare non vuota', () => {
    expect(interno.celle.length).toBeGreaterThan(0)
    expect(interno.celle[0].length).toBeGreaterThan(0)
    for (const riga of interno.celle) {
      expect(riga.length).toBe(interno.celle[0].length)
    }
  })

  it('e circondata da muri, cosi non si esce dai lati', () => {
    const celle = interno.celle
    for (let x = 0; x < celle[0].length; x++) expect(celle[0][x]).toBe('muro')
    for (let y = 0; y < celle.length; y++) {
      expect(celle[y][0]).toBe('muro')
      expect(celle[y][celle[y].length - 1]).toBe('muro')
    }
    // In fondo c'è l'uscita, quindi l'ultima riga non è tutta muro.
    expect(celle[celle.length - 1]).toContain('uscita')
  })

  it('ricava i mobili come oggetti interi, non come singole celle', () => {
    const letto = interno.mobili.find((m) => m.simbolo === 'L')
    expect(letto).toBeDefined()
    expect(letto!.larghezza).toBeGreaterThan(1)
    expect(letto!.tipo.azione).toBe('dormi')
  })

  it('mette in casa tutto ciò che il giocatore deve poter fare', () => {
    const azioni = new Set(interno.mobili.map((m) => m.tipo.azione))
    expect(azioni).toContain('dormi')
    expect(azioni).toContain('mangia')
    expect(azioni).toContain('nascondi')
  })

  it('protesta se la pianta non torna', () => {
    expect(() => generaInterno('inventata')).toThrow()
  })
})

describe('calpestabileInterno', () => {
  it('lascia camminare sul pavimento', () => {
    const p = ingresso(interno)
    expect(calpestabileInterno(interno, p.x, p.y)).toBe(true)
  })

  it('blocca contro i muri', () => {
    expect(calpestabileInterno(interno, 0, 0)).toBe(false)
  })

  it('blocca contro i mobili ingombranti', () => {
    const letto = interno.mobili.find((m) => m.simbolo === 'L')!
    for (const cella of celleDelMobile(letto)) {
      expect(calpestabileInterno(interno, cella.x, cella.y)).toBe(false)
    }
  })

  it('blocca fuori dalla stanza', () => {
    expect(calpestabileInterno(interno, -1, 3)).toBe(false)
    expect(calpestabileInterno(interno, 3, 99)).toBe(false)
  })
})

/**
 * Il test che conta su una pianta scritta a mano: una stanza murata o un
 * armadio piazzato davanti a una porta non darebbero nessun altro segnale.
 */
describe('la casa e percorribile', () => {
  it('si arriva a ogni mobile partendo dall ingresso', () => {
    const raggiungibili = esploraAPiedi(interno)

    for (const mobile of interno.mobili) {
      const accostabile = celleDelMobile(mobile).some((cella) =>
        [
          { x: cella.x + 1, y: cella.y },
          { x: cella.x - 1, y: cella.y },
          { x: cella.x, y: cella.y + 1 },
          { x: cella.x, y: cella.y - 1 },
        ].some((vicina) => raggiungibili.has(`${vicina.x},${vicina.y}`)),
      )

      expect(accostabile, `${mobile.tipo.nome} è irraggiungibile`).toBe(true)
    }
  })

  it('ogni casa dichiarata ha un uscita e regge la generazione', () => {
    for (const casa of CASE) {
      const generato = generaInterno(casa.id)
      expect(() => cellaUscita(generato)).not.toThrow()
    }
  })
})

describe('mobileAllaPortata', () => {
  it('propone il mobile a cui si è accanto', () => {
    const letto = interno.mobili.find((m) => m.simbolo === 'L')!
    const accanto = { x: letto.origine.x + 0.5, y: letto.origine.y + letto.altezza + 0.5 }

    expect(mobileAllaPortata(interno, accanto)?.simbolo).toBe('L')
  })

  it('non propone nulla in mezzo al corridoio', () => {
    expect(mobileAllaPortata(interno, ingresso(interno))).toBeNull()
  })

  it('ignora l arredo che non sa fare niente', () => {
    const tavolo = interno.mobili.find((m) => m.simbolo === 'T')!
    const accanto = {
      x: tavolo.origine.x + 0.5,
      y: tavolo.origine.y + tavolo.altezza + 0.5,
    }

    expect(mobileAllaPortata(interno, accanto)).toBeNull()
  })
})

describe('ingresso e uscita', () => {
  it('mette il giocatore su una cella libera, vicino alla porta', () => {
    const p = ingresso(interno)
    expect(calpestabileInterno(interno, p.x, p.y)).toBe(true)
    expect(sullUscita(interno, p)).toBe(true)
  })

  it('non scatta dall altra parte della casa', () => {
    expect(sullUscita(interno, { x: 1.5, y: 1.5 })).toBe(false)
  })
})

/** Riempimento a partire dall'ingresso, muovendosi solo dove si può. */
function esploraAPiedi(interno: Interno): Set<string> {
  const partenza = cellaUscita(interno)
  const visti = new Set<string>([`${partenza.x},${partenza.y}`])
  const coda = [partenza]

  while (coda.length > 0) {
    const { x, y } = coda.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      const chiave = `${nx},${ny}`
      if (visti.has(chiave)) continue
      if (!calpestabileInterno(interno, nx, ny)) continue

      visti.add(chiave)
      coda.push({ x: nx, y: ny })
    }
  }

  return visti
}
