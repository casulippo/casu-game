/**
 * Le case e come sono fatte dentro.
 *
 * Una casa è un disegno di testo più una legenda. Scriverla così invece che
 * come una lista di coordinate significa che la pianta si legge — e si
 * corregge — guardandola, senza aprire il gioco: già solo rileggendo il
 * disegno si vede se una stanza è murata o se un mobile tappa una porta.
 *
 * Il brief prevede cinque tipi di casa con effetti diversi sul gioco e la
 * possibilità di averne più d'una: per questo la casa è un dato in un elenco e
 * non una pianta sola cablata nel codice.
 */

export type TipoCasa = 'stanza' | 'appartamento' | 'villa' | 'rifugio' | 'copertura'

/** Cosa si può fare con un mobile. I mobili senza azione sono solo arredo. */
export type AzioneMobile = 'dormi' | 'mangia' | 'nascondi'

export interface TipoMobile {
  nome: string
  azione: AzioneMobile | null
  /** Se ingombra, ci si gira intorno. */
  blocca: boolean
}

/**
 * La legenda della pianta.
 *
 * Ogni lettera è un mobile; celle contigue con la stessa lettera sono lo stesso
 * mobile, così un letto matrimoniale si disegna semplicemente più largo.
 */
export const MOBILI: Record<string, TipoMobile> = {
  L: { nome: 'Letto', azione: 'dormi', blocca: true },
  C: { nome: 'Cucina', azione: 'mangia', blocca: true },
  N: { nome: 'Armadio', azione: 'nascondi', blocca: true },
  T: { nome: 'Tavolo', azione: null, blocca: true },
  D: { nome: 'Divano', azione: null, blocca: true },
}

export const MURO = '#'
export const PAVIMENTO = '.'
export const USCITA = 'U'

export interface Casa {
  id: string
  nome: string
  tipo: TipoCasa
  /**
   * La pianta, riga per riga. Tutte le righe hanno la stessa lunghezza, e
   * l'uscita sta sul muro in basso: si esce camminando verso chi guarda.
   */
  pianta: string[]
}

/**
 * L'appartamento di partenza.
 *
 * Due stanze e un corridoio: si entra dal basso, la camera sta a sinistra e la
 * cucina a destra. Dentro è più grande di quanto l'ingombro in città lasci
 * intendere — è la convenzione del genere, e senza non ci starebbe un letto.
 */
const APPARTAMENTO_INIZIALE: Casa = {
  id: 'casa',
  nome: 'Casa',
  tipo: 'appartamento',
  pianta: [
    '#################',
    '#.......#.......#',
    '#.LL....#...CC..#',
    '#.LL....#...CC..#',
    '#.......#.......#',
    '#.NN....#DD..TT.#',
    '#.......#DD..TT.#',
    '#####.#####.#####',
    '#...............#',
    '#...............#',
    '#######U#########',
  ],
}

export const CASE: Casa[] = [APPARTAMENTO_INIZIALE]

export function casaPerId(id: string, case_ = CASE): Casa {
  const trovata = case_.find((c) => c.id === id)
  if (!trovata) throw new Error(`Casa sconosciuta: ${id}`)
  return trovata
}
