import type { Griglia } from './iso'
import { ARREDO, bloccaIlPasso } from './arredo'
import { LUOGHI, celleOccupate, type Luogo } from './luoghi'
import { LATO_CITTA, quartiereIn, type DatiQuartiere } from './quartieri'

export type Cella =
  | 'strada'
  | 'marciapiede'
  | 'erba'
  | 'albero'
  | 'edificio'
  | 'acqua'
  /** Occupata da arredo urbano ingombrante: ci si gira intorno. */
  | 'ostacolo'

export { LATO_CITTA }

/** Ogni quanto passa una strada dentro un quartiere. */
const PASSO_ISOLATO = 6

/** Il mare lambisce la città a nord e a ovest del porto. */
function suAcqua(x: number, y: number): boolean {
  return y < 2 || (x < 2 && y < 14)
}

/**
 * Costruisce la mappa della città.
 *
 * Prima il tessuto urbano quartiere per quartiere, poi gli alberi, poi l'arredo,
 * infine i luoghi con identità propria. L'ordine conta: ogni strato può
 * sovrascrivere il precedente.
 */
export function generaCitta(
  lato = LATO_CITTA,
  luoghi: Luogo[] = LUOGHI,
): Cella[][] {
  const mappa: Cella[][] = []

  for (let y = 0; y < lato; y++) {
    const riga: Cella[] = []
    for (let x = 0; x < lato; x++) {
      riga.push(terrenoIn(x, y))
    }
    mappa.push(riga)
  }

  posaAlberi(mappa)

  for (const arredo of ARREDO) {
    if (bloccaIlPasso(arredo.tipo) && dentro(mappa, arredo.x, arredo.y)) {
      mappa[arredo.y][arredo.x] = 'ostacolo'
    }
  }

  for (const luogo of luoghi) {
    for (const cella of celleOccupate(luogo)) {
      if (dentro(mappa, cella.x, cella.y)) {
        mappa[cella.y][cella.x] = 'edificio'
      }
    }
    // La porta resta sempre praticabile, altrimenti il luogo è irraggiungibile.
    if (dentro(mappa, luogo.porta.x, luogo.porta.y)) {
      mappa[luogo.porta.y][luogo.porta.x] = 'marciapiede'
    }
  }

  return mappa
}

/**
 * Il tessuto urbano di una cella.
 *
 * La griglia stradale è comune a tutta la città, così i quartieri restano
 * collegati e si passa dall'uno all'altro camminando. Cambiano i materiali e
 * quanto fittamente si costruisce.
 */
function terrenoIn(x: number, y: number): Cella {
  if (suAcqua(x, y)) return 'acqua'

  const q = quartiereIn(x, y)

  // Le arterie che separano i quartieri sono sempre percorribili.
  if (suArteria(x, y)) return 'strada'

  // La periferia non è pianificata: niente isolati regolari, ma vicoli.
  if (q.id === 'periferia') return terrenoPeriferia(x, y)

  const locX = x - q.origine.x
  const locY = y - q.origine.y

  if (locX % PASSO_ISOLATO === 0 || locY % PASSO_ISOLATO === 0) return 'strada'

  const suBordo =
    locX % PASSO_ISOLATO === 1 ||
    locY % PASSO_ISOLATO === 1 ||
    locX % PASSO_ISOLATO === PASSO_ISOLATO - 1 ||
    locY % PASSO_ISOLATO === PASSO_ISOLATO - 1

  if (suBordo) return 'marciapiede'

  return costruito(x, y, q) ? 'edificio' : 'erba'
}

/**
 * Il tessuto della periferia: vicoli invece di isolati.
 *
 * Un quartiere cresciuto senza piano non ha strade dritte. I passaggi
 * serpeggiano, si stringono e si allargano, e tra l'uno e l'altro restano
 * cortili e spiazzi. È questo, più degli edifici, a far sentire che si è
 * altrove rispetto al centro.
 *
 * I corridoi principali si incrociano sempre, quindi il quartiere resta
 * percorribile: la verifica è comunque affidata al test di percorribilità,
 * perché con passaggi calcolati un vicolo murato non darebbe altro segnale.
 */
function terrenoPeriferia(x: number, y: number): Cella {
  if (vicolo(x, y)) return 'strada'

  // Spiazzi e cortili tra un edificio e l'altro. Sono abbondanti: un quartiere
  // tutto costruito diventa un labirinto in cui non si respira.
  if (casuale(x, y, 55.31, 19.77) < 0.45) return 'erba'

  return 'edificio'
}

function vicolo(x: number, y: number): boolean {
  // Passaggi che attraversano il quartiere, ondeggiando.
  for (const base of [17, 21, 25, 29, 33, 37, 41, 45]) {
    const scarto = Math.round(Math.sin(x * 0.42 + base) * 1.8)
    const centro = base + scarto
    // Larghezza variabile: certi tratti si strozzano, altri si aprono.
    const largo = Math.sin(x * 0.7 + base * 1.3) > -0.2
    if (y === centro || (largo && y === centro + 1)) return true
  }

  // Passaggi trasversali, più radi.
  for (const base of [3, 7, 11, 15]) {
    const scarto = Math.round(Math.sin(y * 0.38 + base) * 1.6)
    if (x === base + scarto) return true
  }

  return false
}

/** Le strade di confine tra un quartiere e l'altro. */
function suArteria(x: number, y: number): boolean {
  const confiniX = [18, 34]
  const confiniY = [14, 24]
  return confiniX.includes(x) || confiniY.includes(y)
}

/**
 * Se il cuore di un isolato è costruito.
 *
 * Deterministico: la città non cambia forma a ogni caricamento, quindi non serve
 * salvarne l'aspetto.
 */
function costruito(x: number, y: number, q: DatiQuartiere): boolean {
  return casuale(x, y, 12.9898, 78.233) < q.densita
}

/** Quanti piani ha l'edificio in questa cella, secondo il suo quartiere. */
export function pianiEdificio(x: number, y: number): number {
  const q = quartiereIn(x, y)
  const [min, max] = q.piani
  return min + Math.floor(casuale(x, y, 39.3467, 11.135) * (max - min + 1))
}

/** Il colore della facciata, scelto tra quelli del quartiere. */
export function tintaEdificio(x: number, y: number): number {
  const q = quartiereIn(x, y)
  return q.edifici[Math.floor(casuale(x, y, 7.331, 51.77) * q.edifici.length)]
}

/**
 * Rumore deterministico tra 0 e 1.
 *
 * La città non cambia forma a ogni caricamento, quindi non serve salvarne
 * l'aspetto: basta ricalcolarlo dalle coordinate.
 */
function casuale(x: number, y: number, a: number, b: number): number {
  const n = Math.sin(x * a + y * b) * 43758.5453
  return n - Math.floor(n)
}

/** Alberi e verde, più fitti dove il quartiere è meno costruito. */
function posaAlberi(mappa: Cella[][]) {
  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (mappa[y][x] !== 'erba') continue

      const q = quartiereIn(x, y)
      const rumore = Math.sin(x * 45.164 + y * 21.377) * 19541.31
      const frazione = rumore - Math.floor(rumore)

      // Dove si costruisce poco resta più verde.
      if (frazione < (1 - q.densita) * 0.55) mappa[y][x] = 'albero'
    }
  }
}

function dentro(mappa: Cella[][], x: number, y: number): boolean {
  return y >= 0 && y < mappa.length && x >= 0 && x < mappa[y].length
}

/** Il terreno "nudo", senza arredo né luoghi: serve per la pavimentazione. */
export function terrenoSotto(x: number, y: number): Cella {
  return terrenoIn(x, y)
}

/** Si può camminare qui? */
export function calpestabile(mappa: Cella[][], x: number, y: number): boolean {
  const cx = Math.floor(x)
  const cy = Math.floor(y)

  if (!dentro(mappa, cx, cy)) return false

  const cella = mappa[cy][cx]
  return (
    cella !== 'edificio' &&
    cella !== 'albero' &&
    cella !== 'ostacolo' &&
    cella !== 'acqua'
  )
}

/** Il giocatore comincia davanti a casa, nel quartiere residenziale. */
export function puntoDiPartenza(mappa: Cella[][]): Griglia {
  const casa = LUOGHI.find((l) => l.id === 'casa')
  if (casa && calpestabile(mappa, casa.porta.x, casa.porta.y)) {
    return { x: casa.porta.x + 0.5, y: casa.porta.y + 0.5 }
  }

  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (calpestabile(mappa, x, y)) return { x: x + 0.5, y: y + 0.5 }
    }
  }

  return { x: 0.5, y: 0.5 }
}
