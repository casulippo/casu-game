import type { Griglia } from './iso'
import { ARREDO, bloccaIlPasso } from './arredo'
import { LUOGHI, celleOccupate, type Luogo } from './luoghi'
import { LATO_CITTA, quartiereIn } from './quartieri'
import { pianoStradale, type Rango, type Segmento } from './strade'

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

/**
 * I parchi.
 *
 * Non sono isolati lasciati vuoti: le strade non li attraversano proprio, e
 * questo basta a farne dei punti di riferimento in una maglia altrimenti
 * regolare. Il verde grande si vede da lontano ed è quello che dice "sono
 * dall'altra parte della città" meglio di qualsiasi cambio di palette.
 */
const PARCHI = [
  { x: 70, y: 12, larghezza: 17, altezza: 15 },
  // Il parchetto delle bandelle: è qui che si combatte il primo scontro.
  { x: 10, y: 28, larghezza: 12, altezza: 11 },
]

/**
 * Dove arriva il mare.
 *
 * La costa non è una linea retta: un bordo dritto denuncia il rettangolo della
 * mappa, mentre un profilo mosso fa sembrare che la città finisca dove finisce
 * la terra. L'insenatura a ovest è la darsena del porto.
 */
function suAcqua(x: number, y: number): boolean {
  const costa = 3 + Math.round(Math.sin(x * 0.11) * 2 + Math.sin(x * 0.31) * 1.2)
  if (y < costa) return true

  const darsena = 9 + Math.round(Math.sin(y * 0.17) * 2.5)
  return x < darsena && y < 26
}

/** Si è dentro un parco? Serve anche fuori: i parchetti sono piazze di spaccio. */
export function nelParco(x: number, y: number): boolean {
  return dentroParco(Math.floor(x), Math.floor(y))
}

function dentroParco(x: number, y: number): boolean {
  return PARCHI.some(
    (p) => x >= p.x && x < p.x + p.larghezza && y >= p.y && y < p.y + p.altezza,
  )
}

/** La fascia di carreggiata che passa per una cella. */
interface Fascia {
  rango: Rango
  /** A quale corsia siamo, contando dal bordo della carreggiata. */
  offset: number
  larghezza: number
}

interface Terreno {
  celle: Cella[][]
  verticali: (Fascia | null)[][]
  orizzontali: (Fascia | null)[][]
}

let terreno: Terreno | null = null

function base(): Terreno {
  if (!terreno) terreno = dipingi()
  return terreno
}

/**
 * Il terreno nudo, dipinto una volta sola.
 *
 * L'ordine è quello di un cantiere: prima le strade di quartiere, poi i viali
 * che passano sopra, poi i parchi che le cancellano dove non devono passare,
 * poi i marciapiedi lungo tutto ciò che è rimasto carreggiata, infine il mare
 * che ha l'ultima parola.
 */
function dipingi(): Terreno {
  const celle: Cella[][] = []
  const verticali: (Fascia | null)[][] = []
  const orizzontali: (Fascia | null)[][] = []

  for (let y = 0; y < LATO_CITTA; y++) {
    celle.push(new Array<Cella>(LATO_CITTA).fill('erba'))
    verticali.push(new Array<Fascia | null>(LATO_CITTA).fill(null))
    orizzontali.push(new Array<Fascia | null>(LATO_CITTA).fill(null))
  }

  const piano = pianoStradale()

  for (const s of piano.verticali) {
    percorri(s, (trasversale, lungo) => {
      celle[lungo][trasversale] = 'strada'
      verticali[lungo][trasversale] = fascia(s, trasversale)
    })
  }

  for (const s of piano.orizzontali) {
    percorri(s, (trasversale, lungo) => {
      celle[trasversale][lungo] = 'strada'
      orizzontali[trasversale][lungo] = fascia(s, trasversale)
    })
  }

  for (let y = 0; y < LATO_CITTA; y++) {
    for (let x = 0; x < LATO_CITTA; x++) {
      if (!dentroParco(x, y)) continue
      celle[y][x] = 'erba'
      verticali[y][x] = null
      orizzontali[y][x] = null
    }
  }

  posaMarciapiedi(celle, verticali, orizzontali)

  for (let y = 0; y < LATO_CITTA; y++) {
    for (let x = 0; x < LATO_CITTA; x++) {
      if (suAcqua(x, y)) celle[y][x] = 'acqua'
    }
  }

  return { celle, verticali, orizzontali }
}

/**
 * Scorre le celle di un segmento.
 *
 * Il verso lo decide chi chiama: per un tratto verticale `trasversale` è la x,
 * per uno orizzontale è la y.
 */
function percorri(s: Segmento, tocca: (trasversale: number, lungo: number) => void) {
  const daT = Math.max(0, s.da)
  const aT = Math.min(LATO_CITTA, s.da + s.larghezza)
  const daL = Math.max(0, s.inizio)
  const aL = Math.min(LATO_CITTA, s.fine)

  for (let t = daT; t < aT; t++) {
    for (let l = daL; l < aL; l++) tocca(t, l)
  }
}

function fascia(s: Segmento, trasversale: number): Fascia {
  return { rango: s.rango, offset: trasversale - s.da, larghezza: s.larghezza }
}

/**
 * Il marciapiede: un anello attorno a ogni carreggiata.
 *
 * Ricavarlo dalla vicinanza invece che dichiararlo significa che segue da sé
 * qualunque forma prendano le strade, angoli e incroci compresi.
 *
 * I vicoli non ne hanno: un passaggio di servizio largo una cella è tutto
 * carreggiata, e bordarlo di marciapiede lo farebbe sembrare una via vera.
 */
function posaMarciapiedi(
  celle: Cella[][],
  verticali: (Fascia | null)[][],
  orizzontali: (Fascia | null)[][],
) {
  const conMarciapiede = (x: number, y: number) => {
    if (celle[y]?.[x] !== 'strada') return false
    const rango = (verticali[y][x] ?? orizzontali[y][x])?.rango
    return rango !== 'vicolo'
  }

  const bordi: boolean[][] = celle.map((riga, y) =>
    riga.map((_, x) => conMarciapiede(x, y)),
  )

  for (let y = 0; y < LATO_CITTA; y++) {
    for (let x = 0; x < LATO_CITTA; x++) {
      if (celle[y][x] !== 'erba') continue

      const accanto =
        bordi[y]?.[x - 1] || bordi[y]?.[x + 1] || bordi[y - 1]?.[x] || bordi[y + 1]?.[x]

      if (accanto) celle[y][x] = 'marciapiede'
    }
  }
}

/**
 * Costruisce la mappa della città.
 *
 * Prima il terreno, poi gli alberi, poi l'arredo, infine i luoghi con identità
 * propria. L'ordine conta: ogni strato può sovrascrivere il precedente.
 */
export function generaCitta(
  lato = LATO_CITTA,
  luoghi: Luogo[] = LUOGHI,
): Cella[][] {
  const mappa = base().celle.slice(0, lato).map((riga) => riga.slice(0, lato))

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

/** Il terreno "nudo", senza arredo né luoghi: serve per la pavimentazione. */
export function terrenoSotto(x: number, y: number): Cella {
  return base().celle[y]?.[x] ?? 'acqua'
}

/**
 * Dove passa la mezzeria dentro una cella, espressa come frazione del lato.
 *
 * È la riga tratteggiata a dire dove comincia e dove finisce la carreggiata:
 * senza, l'asfalto è una macchia e l'incrocio non si legge. Agli incroci la
 * segnaletica si interrompe, come nelle strade vere — ed è proprio
 * l'interruzione a far capire che lì la strada cambia.
 */
export interface Mezzeria {
  /** Frazione della larghezza a cui corre la linea nord-sud, o null. */
  verticale: number | null
  /** Frazione dell'altezza a cui corre la linea est-ovest, o null. */
  orizzontale: number | null
  /**
   * I viali portano la doppia striscia continua.
   *
   * È il segno che distingue a colpo d'occhio un viale da una strada di
   * quartiere: senza, la gerarchia stradale esiste nei dati ma non si vede.
   */
  doppia: boolean
}

const SENZA_MEZZERIA: Mezzeria = { verticale: null, orizzontale: null, doppia: false }

export function mezzeriaIn(x: number, y: number): Mezzeria {
  if (terrenoSotto(x, y) !== 'strada') return SENZA_MEZZERIA
  // Dove attraversano i pedoni la mezzeria si interrompe.
  if (strisceIn(x, y) !== null) return SENZA_MEZZERIA

  const { verticali, orizzontali } = base()
  const v = verticali[y][x]
  const o = orizzontali[y][x]

  const verticale = o ? null : centroFascia(v)
  const orizzontale = v ? null : centroFascia(o)
  const portante = verticale !== null ? v : orizzontale !== null ? o : null

  return { verticale, orizzontale, doppia: portante?.rango === 'viale' }
}

/**
 * Dove cade la mezzeria dentro la cella, o null se questa cella non la ospita.
 *
 * Con un numero pari di corsie la linea sta sul confine tra le due centrali, e
 * a disegnarla è quella che le sta a sinistra: altrimenti verrebbe tracciata
 * due volte, una per corsia. I vicoli non ne hanno: sono larghi una cella, non
 * ci sono due sensi di marcia da separare.
 */
function centroFascia(fascia: Fascia | null): number | null {
  if (!fascia || fascia.rango === 'vicolo') return null

  if (fascia.larghezza % 2 === 0) {
    return fascia.offset === fascia.larghezza / 2 - 1 ? 1 : null
  }

  return fascia.offset === (fascia.larghezza - 1) / 2 ? 0.5 : null
}

/**
 * L'asse di marcia delle auto in questa cella: dice come vanno orientate le
 * strisce pedonali, che corrono parallele al traffico.
 */
export type Attraversamento = 'verticale' | 'orizzontale'

/**
 * Se qui passa un attraversamento pedonale, e con che orientamento.
 *
 * Le strisce stanno appena fuori dagli incroci dei viali. Segnarle a ogni
 * incrocio di ogni viuzza le rendeva il motivo dominante della mappa: sono un
 * accento, e un accento ovunque non è più un accento.
 */
export function strisceIn(x: number, y: number): Attraversamento | null {
  if (terrenoSotto(x, y) !== 'strada') return null

  const { verticali, orizzontali } = base()
  const v = verticali[y][x]
  const o = orizzontali[y][x]

  // Dentro l'incrocio non si segna nulla: le strisce stanno sui bracci.
  if (v && o) return null

  if (v?.rango === 'viale') {
    return incrocio(x, y - 1) || incrocio(x, y + 1) ? 'verticale' : null
  }

  if (o?.rango === 'viale') {
    return incrocio(x - 1, y) || incrocio(x + 1, y) ? 'orizzontale' : null
  }

  return null
}

/**
 * Una cella dove due strade vere si incrociano.
 *
 * I vicoli non contano: sono passaggi di servizio, e trattarli da incrocio
 * riempiva i viali di attraversamenti uno ogni tre celle.
 */
function incrocio(x: number, y: number): boolean {
  const { verticali, orizzontali } = base()
  const v = verticali[y]?.[x]
  const o = orizzontali[y]?.[x]
  return Boolean(v && o && v.rango !== 'vicolo' && o.rango !== 'vicolo')
}

/** Alberi e verde: fitti nei parchi, radi negli isolati liberi. */
function posaAlberi(mappa: Cella[][]) {
  for (let y = 0; y < mappa.length; y++) {
    for (let x = 0; x < mappa[y].length; x++) {
      if (mappa[y][x] !== 'erba') continue

      const rumore = Math.sin(x * 45.164 + y * 21.377) * 19541.31
      const frazione = rumore - Math.floor(rumore)

      const soglia = dentroParco(x, y) ? 0.34 : (1 - quartiereIn(x, y).densita) * 0.3
      if (frazione < soglia) mappa[y][x] = 'albero'
    }
  }
}

function dentro(mappa: Cella[][], x: number, y: number): boolean {
  return y >= 0 && y < mappa.length && x >= 0 && x < mappa[y].length
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
