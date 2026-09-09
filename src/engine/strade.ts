import { LATO_CITTA, QUARTIERI } from './quartieri'

/**
 * Il piano stradale della città.
 *
 * Una maglia a passo fisso dà una cialda: tutti gli isolati uguali, nessuna
 * strada più importante di un'altra, e da sopra si legge carta millimetrata
 * invece di una città. Qui le strade hanno tre ranghi e gli isolati misure
 * diverse quartiere per quartiere.
 *
 * I viali sono l'ossatura: attraversano la città intera e cadono esattamente
 * sui confini tra i quartieri, così il passaggio da una zona all'altra ha una
 * ragione visibile invece di essere uno stacco di colore. Dentro ogni zona
 * corrono le strade, a distanze che cambiano secondo il carattere del
 * quartiere; dove un isolato verrebbe troppo profondo lo taglia un vicolo.
 */

export type Rango = 'viale' | 'strada' | 'vicolo'

export const LARGHEZZA: Record<Rango, number> = {
  viale: 4,
  strada: 2,
  vicolo: 1,
}

/**
 * Un tratto di carreggiata, dritto.
 *
 * `da` è la coordinata trasversale della prima corsia: la x per i tratti
 * verticali, la y per quelli orizzontali. `inizio` e `fine` dicono invece da
 * dove a dove corre lungo il proprio asse.
 */
export interface Segmento {
  rango: Rango
  da: number
  larghezza: number
  inizio: number
  fine: number
}

export interface PianoStradale {
  verticali: Segmento[]
  orizzontali: Segmento[]
}

/**
 * Dove passano i viali.
 *
 * Coincidono con i confini dichiarati in `quartieri.ts`, centrati sul confine:
 * metà viale sta in una zona e metà nell'altra.
 */
export const VIALI_X = [30, 62]
export const VIALI_Y = [46]

/** Oltre questa profondità un isolato va spezzato da un vicolo. */
const ISOLATO_TROPPO_PROFONDO = 13

let piano: PianoStradale | null = null

/** Il piano stradale, calcolato una volta sola: la città non cambia forma. */
export function pianoStradale(): PianoStradale {
  if (!piano) piano = costruisci()
  return piano
}

function costruisci(): PianoStradale {
  const verticali: Segmento[] = []
  const orizzontali: Segmento[] = []

  // Prima le strade di quartiere, che si fermano al viale: è il viale a
  // raccoglierle, non il contrario.
  for (const q of QUARTIERI) {
    const x0 = q.origine.x
    const x1 = q.origine.x + q.larghezza
    const y0 = q.origine.y
    const y1 = q.origine.y + q.altezza
    const seme = q.id.length * 131 + q.origine.x * 7 + q.origine.y * 13

    verticali.push(...assi(x0, x1, y0, y1, q.isolato, seme))
    orizzontali.push(...assi(y0, y1, x0, x1, q.isolato, seme + 977))
  }

  for (const x of VIALI_X) {
    verticali.push({
      rango: 'viale',
      da: x,
      larghezza: LARGHEZZA.viale,
      inizio: 0,
      fine: LATO_CITTA,
    })
  }

  for (const y of VIALI_Y) {
    orizzontali.push({
      rango: 'viale',
      da: y,
      larghezza: LARGHEZZA.viale,
      inizio: 0,
      fine: LATO_CITTA,
    })
  }

  return { verticali, orizzontali }
}

/**
 * Le strade di un quartiere lungo un asse, con gli isolati che si alternano
 * di misura. Dove il passo è largo si infila un vicolo a metà, così un isolato
 * profondo non diventa un blocco impenetrabile.
 */
function assi(
  daTrasversale: number,
  aTrasversale: number,
  inizio: number,
  fine: number,
  isolato: [number, number],
  seme: number,
): Segmento[] {
  const segmenti: Segmento[] = []
  const [min, max] = isolato

  let v = daTrasversale
  let passi = 0

  while (passi < 100) {
    const passo = min + Math.floor(casuale(seme, passi) * (max - min + 1))
    const inizioStrada = v + passo

    if (inizioStrada + LARGHEZZA.strada >= aTrasversale) break

    if (passo >= ISOLATO_TROPPO_PROFONDO) {
      segmenti.push({
        rango: 'vicolo',
        da: v + Math.floor(passo / 2),
        larghezza: LARGHEZZA.vicolo,
        inizio,
        fine,
      })
    }

    segmenti.push({
      rango: 'strada',
      da: inizioStrada,
      larghezza: LARGHEZZA.strada,
      inizio,
      fine,
    })

    v = inizioStrada + LARGHEZZA.strada
    passi++
  }

  return segmenti
}

/** Rumore deterministico tra 0 e 1: la città non cambia forma a ogni avvio. */
function casuale(seme: number, passo: number): number {
  const n = Math.sin(seme * 12.9898 + passo * 78.233) * 43758.5453
  return n - Math.floor(n)
}
