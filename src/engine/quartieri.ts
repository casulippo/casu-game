import type { Quartiere } from './state'

/**
 * I sei quartieri della città e il loro carattere.
 *
 * La disposizione segue la mappa d'insieme: il porto a nord-ovest, lo slum a
 * ovest, il centro storico al centro, la zona notturna a sud, i quartieri alti
 * a est. Ogni zona ha materiali e palette propri — è quello che la rende
 * riconoscibile a colpo d'occhio, prima ancora degli edifici.
 */

export type Pavimentazione = 'asfalto' | 'sterrato' | 'ciottolato' | 'lastricato'

export interface DatiQuartiere {
  id: Quartiere
  nome: string
  /** Angolo nord-ovest della zona, in celle. */
  origine: { x: number; y: number }
  larghezza: number
  altezza: number
  pavimentazione: Pavimentazione
  /** Colore del terreno non edificato. */
  suolo: number
  /** Colore della carreggiata. */
  strada: number
  /** Colore del marciapiede, se la zona ne ha. */
  marciapiede: number
  /** Tonalità dominante degli edifici. */
  edifici: number[]
  /** Quanto è costruita la zona, da 0 a 1. */
  densita: number
  /** Altezza degli edifici, in piani: dalle baracche ai grattacieli. */
  piani: [number, number]
  /** Le insegne al neon accendono la zona di notte. */
  neon: boolean
}

export const LATO_CITTA = 48

export const QUARTIERI: DatiQuartiere[] = [
  {
    id: 'porto',
    nome: 'Porto industriale',
    origine: { x: 0, y: 0 },
    larghezza: 18,
    altezza: 14,
    pavimentazione: 'asfalto',
    suolo: 0x3f434a,
    strada: 0x2a2d34,
    marciapiede: 0x565b64,
    edifici: [0x6b5a3f, 0x7a5c3a, 0x5c6470, 0x8a6a3c],
    densita: 0.5,
    piani: [1, 3],
    neon: false,
  },
  {
    id: 'periferia',
    nome: 'Periferia povera',
    origine: { x: 0, y: 14 },
    larghezza: 18,
    altezza: 34,
    pavimentazione: 'sterrato',
    suolo: 0x6b5c44,
    strada: 0x6f6049,
    marciapiede: 0x74654c,
    edifici: [0x7a6248, 0x6b5340, 0x8a7052, 0x5f4c3a],
    densita: 0.72,
    piani: [1, 2],
    neon: false,
  },
  {
    id: 'centro',
    nome: 'Centro storico',
    origine: { x: 18, y: 0 },
    larghezza: 16,
    altezza: 24,
    pavimentazione: 'ciottolato',
    suolo: 0x8a7f6d,
    strada: 0x7d7263,
    marciapiede: 0x968a76,
    edifici: [0xb5674a, 0xa85c42, 0xc2795a, 0x9c5238],
    densita: 0.8,
    piani: [3, 5],
    neon: false,
  },
  {
    id: 'notturna',
    nome: 'Zona notturna',
    origine: { x: 18, y: 24 },
    larghezza: 16,
    altezza: 24,
    pavimentazione: 'asfalto',
    suolo: 0x2e2536,
    strada: 0x241d2b,
    marciapiede: 0x3b3048,
    edifici: [0x4a3358, 0x3d2b4d, 0x5c3a68, 0x42305a],
    densita: 0.85,
    piani: [2, 4],
    neon: true,
  },
  {
    id: 'ricca',
    nome: 'Zona ricca',
    origine: { x: 34, y: 0 },
    larghezza: 14,
    altezza: 24,
    pavimentazione: 'lastricato',
    suolo: 0x5f6b6e,
    strada: 0x3b4248,
    marciapiede: 0x8a949a,
    edifici: [0x5f7d8c, 0x6e8c9c, 0x4e6b7a, 0x7d99a8],
    densita: 0.6,
    piani: [6, 12],
    neon: false,
  },
  {
    id: 'residenziale',
    nome: 'Quartiere residenziale',
    origine: { x: 34, y: 24 },
    larghezza: 14,
    altezza: 24,
    pavimentazione: 'asfalto',
    suolo: 0x4a7a52,
    strada: 0x33383f,
    marciapiede: 0x7d848c,
    edifici: [0xc9b89a, 0xd8c8ac, 0xb5a186, 0xa8967c],
    densita: 0.45,
    piani: [2, 3],
    neon: false,
  },
]

/** Il quartiere che contiene questa cella. */
export function quartiereIn(x: number, y: number): DatiQuartiere {
  for (const q of QUARTIERI) {
    if (
      x >= q.origine.x &&
      x < q.origine.x + q.larghezza &&
      y >= q.origine.y &&
      y < q.origine.y + q.altezza
    ) {
      return q
    }
  }

  // Fuori dalle zone dichiarate: si ricade sul centro.
  return QUARTIERI[2]
}

export function quartierePerId(id: Quartiere): DatiQuartiere {
  const trovato = QUARTIERI.find((q) => q.id === id)
  if (!trovato) throw new Error(`Quartiere sconosciuto: ${id}`)
  return trovato
}
