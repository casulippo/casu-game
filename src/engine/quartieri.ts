import type { Quartiere } from './state'

/**
 * I sei quartieri della città e il loro carattere.
 *
 * Stanno su tre colonne e due fasce, e i confini non sono linee astratte: su
 * ognuno corre un viale, dichiarato in `strade.ts`. Passare da una zona
 * all'altra vuol dire attraversare qualcosa.
 *
 * Ogni zona ha materiali, palette e misura d'isolato propri — è quello che la
 * rende riconoscibile a colpo d'occhio, prima ancora degli edifici.
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
  /** Quanto è costruita la zona, da 0 a 1. */
  densita: number
  /**
   * Quanto sono profondi gli isolati, in celle: da quanto spesso passa una
   * strada. È la misura che più di ogni altra dà il passo a una zona — fitto
   * nel centro storico, largo nei piazzali del porto.
   */
  isolato: [number, number]
  /** Le insegne al neon accendono la zona di notte. */
  neon: boolean
}

export const LATO_CITTA = 96

export const QUARTIERI: DatiQuartiere[] = [
  {
    id: 'porto',
    nome: 'Porto industriale',
    origine: { x: 0, y: 0 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'asfalto',
    suolo: 0x3f434a,
    strada: 0x2a2d34,
    marciapiede: 0x565b64,
    densita: 0.5,
    // Piazzali e capannoni: pochi tagli, isolati enormi.
    isolato: [22, 30],
    neon: false,
  },
  {
    id: 'centro',
    nome: 'Centro storico',
    origine: { x: 32, y: 0 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'ciottolato',
    suolo: 0x8a7f6d,
    strada: 0x7d7263,
    marciapiede: 0x968a76,
    densita: 0.8,
    // Tessuto fitto e minuto, come nelle città cresciute a piedi.
    isolato: [10, 15],
    neon: false,
  },
  {
    id: 'ricca',
    nome: 'Zona ricca',
    origine: { x: 64, y: 0 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'lastricato',
    suolo: 0x5f6b6e,
    strada: 0x3b4248,
    marciapiede: 0x8a949a,
    densita: 0.6,
    isolato: [17, 24],
    neon: false,
  },
  {
    id: 'periferia',
    nome: 'Periferia povera',
    origine: { x: 0, y: 48 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'sterrato',
    suolo: 0x6b5c44,
    strada: 0x6f6049,
    marciapiede: 0x74654c,
    densita: 0.72,
    // Cresciuta senza piano: isolati storti, alcuni minuscoli.
    isolato: [8, 18],
    neon: false,
  },
  {
    id: 'notturna',
    nome: 'Zona notturna',
    origine: { x: 32, y: 48 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'asfalto',
    suolo: 0x2e2536,
    strada: 0x241d2b,
    marciapiede: 0x3b3048,
    densita: 0.85,
    isolato: [12, 18],
    neon: true,
  },
  {
    id: 'residenziale',
    nome: 'Quartiere residenziale',
    origine: { x: 64, y: 48 },
    larghezza: 32,
    altezza: 48,
    pavimentazione: 'asfalto',
    suolo: 0x4a7a52,
    strada: 0x33383f,
    marciapiede: 0x7d848c,
    densita: 0.45,
    isolato: [15, 20],
    neon: false,
  },
]

/**
 * Contrasto minimo garantito tra strada e marciapiede.
 *
 * Ogni quartiere ha la sua palette, ma se i due colori sono troppo simili la
 * strada non si legge più contro il marciapiede: schiarisco o scurisco il
 * marciapiede finché la differenza di luminanza non basta a farlo risaltare.
 */
const CONTRASTO_MINIMO = 40

for (const q of QUARTIERI) {
  q.marciapiede = distanzia(q.strada, q.marciapiede, CONTRASTO_MINIMO)
}

/** Luminanza percepita, 0-255. */
function luminanza(colore: number): number {
  const r = (colore >> 16) & 0xff
  const g = (colore >> 8) & 0xff
  const b = colore & 0xff
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** Sposta `colore` verso il bianco o il nero finché non si stacca da `base`. */
function distanzia(base: number, colore: number, minimo: number): number {
  const diff = luminanza(colore) - luminanza(base)
  if (Math.abs(diff) >= minimo) return colore

  // Schiarisce se il marciapiede era già più chiaro (o identico) della strada,
  // altrimenti lo scurisce ulteriormente: così resta il verso naturale, solo
  // più marcato.
  const fattore = diff >= 0 ? 1.35 : 0.65
  const canale = (spostamento: number) => {
    const v = (colore >> spostamento) & 0xff
    return Math.max(0, Math.min(255, Math.round(v * fattore)))
  }
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}

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
