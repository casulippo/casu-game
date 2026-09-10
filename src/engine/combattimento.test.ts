import { describe, expect, it } from 'vitest'
import {
  DISTANZA_VISTA,
  TEMPO_FUGA,
  avanza,
  iniziaScontro,
  type Comandi,
  type Scontro,
  type SpecNemico,
} from './combattimento'
import { armaPerId, type TipoArma } from './armi'

const FERMO: Comandi = { direzione: { x: 0, y: 0 }, mira: null, spara: false }

function scontro(
  nemici: SpecNemico[],
  arma: TipoArma = 'coltello',
  opzioni: { vita?: number; mira?: number; evitabile?: boolean } = {},
): Scontro {
  return iniziaScontro({
    posGiocatore: { x: 0, y: 0 },
    arma,
    vita: opzioni.vita ?? 100,
    mira: opzioni.mira ?? 100,
    nemici,
    evitabile: opzioni.evitabile,
  })
}

/** Fa girare lo scontro per `secondi`, a passi da un sessantesimo. */
function gira(s: Scontro, secondi: number, comandi: Comandi = FERMO): Scontro {
  const dt = 1 / 60
  let corrente = s
  for (let t = 0; t < secondi; t += dt) {
    corrente = avanza(corrente, dt, comandi).scontro
    if (corrente.esito !== 'in-corso') break
  }
  return corrente
}

describe('il coltello', () => {
  const davanti: SpecNemico[] = [{ tipo: 'banda', pos: { x: 0, y: 1 } }]
  const colpisci: Comandi = { direzione: { x: 0, y: 0 }, mira: { x: 0, y: 1 }, spara: true }

  it('prende chi hai davanti', () => {
    const { scontro: dopo } = avanza(scontro(davanti), 1 / 60, colpisci)
    expect(dopo.nemici[0].vita).toBe(40 - armaPerId('coltello').danno)
  })

  it('non prende chi ti sta alle spalle', () => {
    const alleSpalle = scontro([{ tipo: 'banda', pos: { x: 0, y: -1 } }])
    const { scontro: dopo } = avanza(alleSpalle, 1 / 60, colpisci)
    expect(dopo.nemici[0].vita).toBe(40)
  })

  it('non arriva a chi è lontano: è un coltello, non un fucile', () => {
    const lontano = scontro([{ tipo: 'banda', pos: { x: 0, y: 5 } }])
    const { scontro: dopo } = avanza(lontano, 1 / 60, colpisci)
    expect(dopo.nemici[0].vita).toBe(40)
  })

  it('rispetta la cadenza: tenere premuto non moltiplica i colpi', () => {
    let s = scontro(davanti)
    // Mezzo secondo a colpire, con la cadenza del coltello a 0,5 s.
    for (let i = 0; i < 15; i++) s = avanza(s, 1 / 60, colpisci).scontro

    expect(s.nemici[0].vita).toBe(40 - armaPerId('coltello').danno)
  })
})

describe('la pistola', () => {
  const punta: Comandi = { direzione: { x: 0, y: 0 }, mira: { x: 0, y: 1 }, spara: true }

  it('il proiettile parte, vola e colpisce', () => {
    const s = avanza(scontro([{ tipo: 'banda', pos: { x: 0, y: 5 } }], 'pistola'), 1 / 60, punta)
    expect(s.scontro.proiettili).toHaveLength(1)

    const dopo = gira(s.scontro, 0.5, FERMO)
    expect(dopo.nemici[0]?.vita ?? 0).toBeLessThan(40)
  })

  it('oltre la gittata il colpo cade a terra', () => {
    const s = avanza(scontro([{ tipo: 'banda', pos: { x: 0, y: 40 } }], 'pistola'), 1 / 60, punta)
    const dopo = gira(s.scontro, 1, FERMO)

    expect(dopo.proiettili).toHaveLength(0)
    expect(dopo.nemici[0].vita).toBe(40)
  })

  it('con la mira scarsa i colpi si sparpagliano', () => {
    const preciso = avanza(scontro([], 'pistola', { mira: 100 }), 1 / 60, punta)
    const impreciso = avanza(scontro([], 'pistola', { mira: 0 }), 1 / 60, punta)

    expect(preciso.scontro.proiettili[0].vel.x).toBe(0)
    expect(impreciso.scontro.proiettili[0].vel.x).not.toBe(0)
  })
})

describe('i nemici', () => {
  it('la banda ti viene addosso e ti accoltella', () => {
    const dopo = gira(scontro([{ tipo: 'banda', pos: { x: 0, y: 6 } }]), 4)
    expect(dopo.giocatore.vita).toBeLessThan(100)
  })

  it('i poliziotti sparano da lontano invece di venire a contatto', () => {
    const dopo = gira(scontro([{ tipo: 'poliziotto', pos: { x: 0, y: 10 } }]), 3)
    const distanza = Math.hypot(
      dopo.nemici[0].pos.x - dopo.giocatore.pos.x,
      dopo.nemici[0].pos.y - dopo.giocatore.pos.y,
    )

    expect(distanza).toBeGreaterThan(3)
    expect(dopo.giocatore.vita).toBeLessThan(100)
  })

  it('i passanti scappano, non attaccano', () => {
    const dopo = gira(scontro([{ tipo: 'passante', pos: { x: 0, y: 3 } }]), 2)
    expect(dopo.giocatore.vita).toBe(100)
  })
})

describe('come finisce', () => {
  it('si vince quando non resta nessuno in piedi', () => {
    const uno: SpecNemico[] = [{ tipo: 'banda', pos: { x: 0, y: 1 } }]
    const dopo = gira(scontro(uno), 3, {
      direzione: { x: 0, y: 0 },
      mira: { x: 0, y: 1 },
      spara: true,
    })

    expect(dopo.esito).toBe('vinto')
  })

  it('i passanti non tengono in piedi uno scontro', () => {
    const dopo = gira(scontro([{ tipo: 'passante', pos: { x: 0, y: 3 } }]), 0.1)
    expect(dopo.esito).toBe('vinto')
  })

  it('si perde quando la vita finisce', () => {
    const dopo = gira(scontro([{ tipo: 'banda', pos: { x: 0, y: 1 } }], 'coltello', { vita: 20 }), 5)
    expect(dopo.esito).toBe('perso')
    expect(dopo.giocatore.vita).toBe(0)
  })

  it('abbattere un passante si fa sapere: è il malus sui clienti', () => {
    const s = scontro([{ tipo: 'passante', pos: { x: 0, y: 1 } }, { tipo: 'banda', pos: { x: 20, y: 0 } }])
    const passo = avanza(s, 1 / 60, {
      direzione: { x: 0, y: 0 },
      mira: { x: 0, y: 1 },
      spara: true,
    })

    // Il passante ha 25 di vita e il coltello ne toglie 30: cade al primo colpo.
    expect(passo.eventi).toContainEqual({ tipo: 'passante-colpito' })
  })
})

describe('la fuga', () => {
  /** Scappare a gambe levate: il poliziotto è più lento e resta indietro. */
  const scappa: Comandi = { direzione: { x: 0, y: -1 }, mira: null, spara: false }

  it('due minuti senza farsi vedere e il raid rientra', () => {
    const s = scontro([{ tipo: 'poliziotto', pos: { x: 0, y: 10 } }], 'coltello', { vita: 500 })
    const dopo = gira(s, TEMPO_FUGA + 5, scappa)

    expect(dopo.esito).toBe('scampato')
  })

  it('farsi vedere fa ripartire il cronometro da capo', () => {
    const addosso = scontro([{ tipo: 'poliziotto', pos: { x: 0, y: 4 } }], 'coltello', { vita: 5_000 })
    const dopo = gira(addosso, TEMPO_FUGA + 5, FERMO)

    expect(dopo.tempoNascosto).toBe(0)
    expect(dopo.esito).toBe('in-corso')
  })

  it('dai raid della storia non si scappa', () => {
    const serio = scontro([{ tipo: 'poliziotto', pos: { x: 0, y: 10 } }], 'coltello', {
      vita: 500,
      evitabile: false,
    })
    const dopo = gira(serio, TEMPO_FUGA + 5, scappa)

    expect(dopo.tempoNascosto).toBeGreaterThan(TEMPO_FUGA)
    expect(dopo.esito).toBe('in-corso')
  })

  it('chi resta oltre la distanza di vista non ti vede', () => {
    const lontano = scontro([{ tipo: 'poliziotto', pos: { x: 0, y: DISTANZA_VISTA + 1 } }])
    const dopo = avanza(lontano, 1 / 60, FERMO)

    expect(dopo.scontro.tempoNascosto).toBeGreaterThan(0)
  })
})

describe('il passo', () => {
  it('non tocca lo scontro che riceve: ne restituisce uno nuovo', () => {
    const prima = scontro([{ tipo: 'banda', pos: { x: 0, y: 3 } }])
    const posIniziale = { ...prima.nemici[0].pos }

    avanza(prima, 1, { direzione: { x: 1, y: 0 }, mira: null, spara: true })

    expect(prima.nemici[0].pos).toEqual(posIniziale)
    expect(prima.giocatore.pos).toEqual({ x: 0, y: 0 })
  })

  it('a scontro finito non succede più niente', () => {
    const finito: Scontro = { ...scontro([]), esito: 'vinto' }
    const passo = avanza(finito, 1, FERMO)

    expect(passo.scontro).toBe(finito)
    expect(passo.eventi).toEqual([])
  })

  it('con lo stesso seme la sparatoria si rigioca uguale', () => {
    const spara: Comandi = { direzione: { x: 0, y: 0 }, mira: { x: 0, y: 1 }, spara: true }
    const uno = gira(scontro([{ tipo: 'banda', pos: { x: 0, y: 8 } }], 'mitraglietta', { mira: 0 }), 2, spara)
    const due = gira(scontro([{ tipo: 'banda', pos: { x: 0, y: 8 } }], 'mitraglietta', { mira: 0 }), 2, spara)

    expect(uno.proiettili).toEqual(due.proiettili)
    expect(uno.nemici).toEqual(due.nemici)
  })
})
