import type { Griglia } from './iso'
import {
  MOBILI,
  MURO,
  USCITA,
  casaPerId,
  type Casa,
  type TipoMobile,
} from './case'

/**
 * Dalla pianta scritta all'interno giocabile.
 *
 * La pianta dice dove stanno muri, pavimento e mobili; qui diventa due cose
 * separate: una griglia di celle per il passo, e un elenco di mobili come
 * oggetti interi. Tenere i mobili come oggetti e non come celle è ciò che
 * permette di parlarci — un letto è un letto anche se occupa quattro celle, e
 * l'azione «dormi» appartiene al letto, non a ciascun suo quadratino.
 */

export type CellaInterno = 'pavimento' | 'muro' | 'uscita'

export interface Mobile {
  simbolo: string
  tipo: TipoMobile
  /** Angolo in alto a sinistra dell'ingombro. */
  origine: Griglia
  larghezza: number
  altezza: number
}

export interface Interno {
  casa: Casa
  celle: CellaInterno[][]
  mobili: Mobile[]
}

export function generaInterno(idCasa = 'casa'): Interno {
  const casa = casaPerId(idCasa)
  const righe = casa.pianta

  const larghezza = righe[0]?.length ?? 0
  if (!larghezza) throw new Error(`La pianta di ${casa.id} è vuota`)
  for (const riga of righe) {
    if (riga.length !== larghezza) {
      throw new Error(`La pianta di ${casa.id} ha righe di lunghezza diversa`)
    }
  }

  const celle: CellaInterno[][] = righe.map((riga) =>
    [...riga].map((simbolo) => cellaDa(simbolo, casa)),
  )

  return { casa, celle, mobili: ritagliaMobili(righe, casa) }
}

function cellaDa(simbolo: string, casa: Casa): CellaInterno {
  if (simbolo === MURO) return 'muro'
  if (simbolo === USCITA) return 'uscita'
  // Sotto un mobile c'è pavimento: è il mobile a dire se ci si passa o no.
  if (simbolo === '.' || MOBILI[simbolo]) return 'pavimento'
  throw new Error(`Simbolo sconosciuto nella pianta di ${casa.id}: ${simbolo}`)
}

/**
 * Raggruppa le celle contigue con la stessa lettera in un mobile solo.
 *
 * Pretende che ogni gruppo sia un rettangolo pieno: un mobile a L sarebbe
 * ambiguo da disegnare e da interrogare, e quasi sempre è un errore di
 * battitura nella pianta. Meglio accorgersene qui che a schermo.
 */
function ritagliaMobili(righe: string[], casa: Casa): Mobile[] {
  const visitate = righe.map((riga) => new Array<boolean>(riga.length).fill(false))
  const mobili: Mobile[] = []

  for (let y = 0; y < righe.length; y++) {
    for (let x = 0; x < righe[y].length; x++) {
      const simbolo = righe[y][x]
      const tipo = MOBILI[simbolo]
      if (!tipo || visitate[y][x]) continue

      let ultimaX = x
      while (righe[y][ultimaX + 1] === simbolo) ultimaX++

      let ultimaY = y
      while (righe[ultimaY + 1]?.[x] === simbolo) ultimaY++

      for (let yy = y; yy <= ultimaY; yy++) {
        for (let xx = x; xx <= ultimaX; xx++) {
          if (righe[yy][xx] !== simbolo) {
            throw new Error(
              `Il mobile ${simbolo} di ${casa.id} non è un rettangolo pieno`,
            )
          }
          visitate[yy][xx] = true
        }
      }

      mobili.push({
        simbolo,
        tipo,
        origine: { x, y },
        larghezza: ultimaX - x + 1,
        altezza: ultimaY - y + 1,
      })
    }
  }

  return mobili
}

/** Le celle occupate da un mobile. */
export function celleDelMobile(mobile: Mobile): Griglia[] {
  const celle: Griglia[] = []
  for (let dy = 0; dy < mobile.altezza; dy++) {
    for (let dx = 0; dx < mobile.larghezza; dx++) {
      celle.push({ x: mobile.origine.x + dx, y: mobile.origine.y + dy })
    }
  }
  return celle
}

export function calpestabileInterno(interno: Interno, x: number, y: number): boolean {
  const cx = Math.floor(x)
  const cy = Math.floor(y)

  const cella = interno.celle[cy]?.[cx]
  if (!cella || cella === 'muro') return false

  return !interno.mobili.some(
    (m) => m.tipo.blocca && dentroIlMobile(m, cx, cy),
  )
}

function dentroIlMobile(mobile: Mobile, x: number, y: number): boolean {
  return (
    x >= mobile.origine.x &&
    x < mobile.origine.x + mobile.larghezza &&
    y >= mobile.origine.y &&
    y < mobile.origine.y + mobile.altezza
  )
}

/** Distanza entro cui un mobile risponde, in celle. */
export const RAGGIO_MOBILE = 1.4

/**
 * Il mobile con cui si può interagire da dove ci si trova.
 *
 * Solo quelli che sanno fare qualcosa: avvicinarsi a un tavolo non deve
 * proporre nulla, altrimenti il pulsante d'azione lampeggia per l'arredamento.
 */
export function mobileAllaPortata(interno: Interno, posizione: Griglia): Mobile | null {
  let piuVicino: Mobile | null = null
  let distanzaMinima = Infinity

  for (const mobile of interno.mobili) {
    if (!mobile.tipo.azione) continue

    for (const cella of celleDelMobile(mobile)) {
      const distanza = Math.hypot(
        cella.x + 0.5 - posizione.x,
        cella.y + 0.5 - posizione.y,
      )
      if (distanza <= RAGGIO_MOBILE && distanza < distanzaMinima) {
        distanzaMinima = distanza
        piuVicino = mobile
      }
    }
  }

  return piuVicino
}

export function cellaUscita(interno: Interno): Griglia {
  for (let y = 0; y < interno.celle.length; y++) {
    for (let x = 0; x < interno.celle[y].length; x++) {
      if (interno.celle[y][x] === 'uscita') return { x, y }
    }
  }
  throw new Error(`La pianta di ${interno.casa.id} non ha un'uscita`)
}

/** Dove compare il giocatore entrando: appena dentro la porta. */
export function ingresso(interno: Interno): Griglia {
  const uscita = cellaUscita(interno)
  return { x: uscita.x + 0.5, y: uscita.y - 0.5 }
}

/** Il giocatore è sulla soglia e può uscire? */
export function sullUscita(interno: Interno, posizione: Griglia): boolean {
  const uscita = cellaUscita(interno)
  const dx = uscita.x + 0.5 - posizione.x
  const dy = uscita.y + 0.5 - posizione.y
  return Math.hypot(dx, dy) <= 1.2
}
