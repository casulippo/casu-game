import type { Deposito, Droga, GameState } from './state'
import type { Griglia } from './iso'
import { calpestabile, generaCitta, type Cella } from './city'
import { conRoba, grammiDi, grammiTotali } from './droga'
import { LATO_CITTA, quartiereIn } from './quartieri'
import { nascondigliAttivi } from './livello'

/**
 * I nascondigli.
 *
 * Sono l'unica assicurazione del gioco: un arresto o uno scontro perso portano
 * via tutto — il contante addosso, la roba addosso e anche quella tenuta in
 * casa — tranne quello che sta in giro per la città.
 *
 * Quanti se ne possono tenere riforniti insieme dipende dal livello: il limite
 * è sul numero di posti usati, non su quanto ci si mette dentro. Ed è quello a
 * rendere una scelta dove seminare il gruzzolo.
 */

export interface Nascondiglio {
  id: string
  nome: string
  cella: Griglia
}

export type { Deposito }

/** Distanza entro cui si riesce a mettere o prendere, in celle. */
export const RAGGIO_NASCONDIGLIO = 1.1

/**
 * Ogni quanto si cerca un posto buono.
 *
 * La città viene setacciata a finestre di undici celle: una per finestra tiene i
 * nascondigli lontani fra loro e sparsi su tutti i quartieri, invece di
 * ammassarli dove il tessuto è più fitto.
 */
const PASSO = 11

const ETICHETTE: Partial<Record<Cella, string>> = {
  albero: 'Tra i cespugli',
  edificio: 'Nel vano scale',
  ostacolo: 'Dietro il cassonetto',
}

let cache: Nascondiglio[] | null = null

/** I posti dove si può nascondere qualcosa. Sono più di cinquanta. */
export function nascondigli(): Nascondiglio[] {
  if (!cache) cache = trova(generaCitta())
  return cache
}

/**
 * Un posto buono è una cella dove si cammina, addossata a qualcosa che la
 * copre: un muro, un albero, un cassonetto. In mezzo alla strada non si
 * nasconde niente.
 */
function trova(mappa: Cella[][]): Nascondiglio[] {
  const trovati: Nascondiglio[] = []

  for (let fy = 0; fy + PASSO <= LATO_CITTA; fy += PASSO) {
    for (let fx = 0; fx + PASSO <= LATO_CITTA; fx += PASSO) {
      const posto = primoRiparo(mappa, fx, fy)
      if (posto) trovati.push(posto)
    }
  }

  return trovati
}

function primoRiparo(
  mappa: Cella[][],
  fx: number,
  fy: number,
): Nascondiglio | null {
  for (let y = fy; y < fy + PASSO; y++) {
    for (let x = fx; x < fx + PASSO; x++) {
      if (!calpestabile(mappa, x, y)) continue

      const riparo = copertura(mappa, x, y)
      if (!riparo) continue

      return {
        id: `n-${x}-${y}`,
        nome: `${ETICHETTE[riparo]} — ${quartiereIn(x, y).nome}`,
        cella: { x, y },
      }
    }
  }

  return null
}

/** Cosa copre questa cella, se qualcosa la copre. */
function copertura(mappa: Cella[][], x: number, y: number): Cella | null {
  const attorno = [
    mappa[y]?.[x - 1],
    mappa[y]?.[x + 1],
    mappa[y - 1]?.[x],
    mappa[y + 1]?.[x],
  ]

  return attorno.find((c) => c !== undefined && c in ETICHETTE) ?? null
}

/** Il nascondiglio a portata di mano da dove si è, se ce n'è uno. */
export function nascondiglioAllaPortata(
  posizione: Griglia,
  posti: Nascondiglio[] = nascondigli(),
): Nascondiglio | null {
  let piuVicino: Nascondiglio | null = null
  let distanzaMinima = Infinity

  for (const posto of posti) {
    // +0.5 perché la posizione del giocatore è al centro della cella.
    const distanza = Math.hypot(
      posto.cella.x + 0.5 - posizione.x,
      posto.cella.y + 0.5 - posizione.y,
    )

    if (distanza <= RAGGIO_NASCONDIGLIO && distanza < distanzaMinima) {
      distanzaMinima = distanza
      piuVicino = posto
    }
  }

  return piuVicino
}

const VUOTO: Deposito = { soldi: 0, roba: {} }

export function deposito(stato: GameState, id: string): Deposito {
  return stato.nascondigli[id] ?? VUOTO
}

/** Un nascondiglio conta come attivo finché contiene qualcosa. */
export function attivo(dep: Deposito): boolean {
  return dep.soldi > 0 || grammiTotali(dep.roba) > 0
}

/** Quanti nascondigli si stanno tenendo riforniti. */
export function nascondigliUsati(stato: GameState): number {
  return Object.values(stato.nascondigli).filter(attivo).length
}

/**
 * Se ne può usare un altro?
 *
 * Uno già rifornito si può sempre rimpinguare: il limite è sul numero di posti,
 * non su quante volte ci si torna.
 */
export function puoUsare(stato: GameState, id: string): boolean {
  if (attivo(deposito(stato, id))) return true
  return nascondigliUsati(stato) < nascondigliAttivi(stato.giocatore.livello)
}

/** Mettere via del contante. Torna lo stato invariato se il posto è di troppo. */
export function nascondiContante(
  stato: GameState,
  id: string,
  importo: number,
): GameState {
  const messi = Math.min(
    Math.max(0, Math.floor(importo)),
    Math.floor(stato.giocatore.contante),
  )
  if (messi === 0 || !puoUsare(stato, id)) return stato

  const dep = deposito(stato, id)

  return conDeposito(
    { ...stato, giocatore: { ...stato.giocatore, contante: stato.giocatore.contante - messi } },
    id,
    { ...dep, soldi: dep.soldi + messi },
  )
}

/** Riprendere il contante: torna in tasca, dove si può perdere. */
export function riprendiContante(
  stato: GameState,
  id: string,
  importo: number,
): GameState {
  const dep = deposito(stato, id)
  const presi = Math.min(Math.max(0, Math.floor(importo)), dep.soldi)
  if (presi === 0) return stato

  return conDeposito(
    { ...stato, giocatore: { ...stato.giocatore, contante: stato.giocatore.contante + presi } },
    id,
    { ...dep, soldi: dep.soldi - presi },
  )
}

export function nascondiRoba(
  stato: GameState,
  id: string,
  droga: Droga,
  grammi: number,
): GameState {
  const messi = Math.min(
    Math.max(0, Math.floor(grammi)),
    Math.floor(grammiDi(stato.giocatore.roba, droga)),
  )
  if (messi === 0 || !puoUsare(stato, id)) return stato

  const dep = deposito(stato, id)

  return conDeposito(
    {
      ...stato,
      giocatore: {
        ...stato.giocatore,
        roba: conRoba(stato.giocatore.roba, droga, -messi),
      },
    },
    id,
    { ...dep, roba: conRoba(dep.roba, droga, messi) },
  )
}

export function riprendiRoba(
  stato: GameState,
  id: string,
  droga: Droga,
  grammi: number,
): GameState {
  const dep = deposito(stato, id)
  const presi = Math.min(Math.max(0, Math.floor(grammi)), grammiDi(dep.roba, droga))
  if (presi === 0) return stato

  return conDeposito(
    {
      ...stato,
      giocatore: {
        ...stato.giocatore,
        roba: conRoba(stato.giocatore.roba, droga, presi),
      },
    },
    id,
    { ...dep, roba: conRoba(dep.roba, droga, -presi) },
  )
}

/**
 * Farsi prendere, o perdere uno scontro.
 *
 * Porta via tutto quello che si può portare via: il contante addosso, la roba
 * addosso e il gruzzolo tenuto in casa, che una perquisizione trova. Restano
 * solo i nascondigli in giro — ed è tutto il senso di averli riforniti.
 */
export function perdiTutto(stato: GameState): GameState {
  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      contante: 0,
      soldiNascosti: 0,
      roba: {},
    },
  }
}

function conDeposito(stato: GameState, id: string, dep: Deposito): GameState {
  const aggiornati = { ...stato.nascondigli, [id]: dep }
  if (!attivo(dep)) delete aggiornati[id]
  return { ...stato, nascondigli: aggiornati }
}
