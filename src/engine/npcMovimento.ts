import type { Griglia } from './iso'
import { calpestabile, type Cella } from './city'
import type { Npc } from './npc'

/**
 * Il giro a vuoto degli NPC fermi.
 *
 * Non è una routine: nessuna meta, nessun orario. Un NPC aspetta un po',
 * sceglie una cella calpestabile lì vicino, ci cammina, aspetta di nuovo. Resta
 * comunque legato al suo posto — il venditore non deve finire in centro — così
 * il raggio di giro è piccolo e misurato dal punto in cui è stato piazzato.
 *
 * Questo modulo non sa cos'è uno sprite: restituisce solo posizione e
 * destinazione. Verso quale direzione l'NPC sta voltato è un fatto della
 * resa a schermo, non del suo cammino — se ne occupa `personaggio.ts`, che lo
 * ricava dallo stesso spostamento usato per muovere il giocatore.
 *
 * Puro come il resto di `engine/`: il generatore casuale è un parametro, non
 * `Math.random()` chiamato a caso nel corpo delle funzioni. È quello che rende
 * testabile "non sceglie mai una cella bloccata" senza dipendere da una
 * sequenza diversa a ogni run.
 */

/** Celle al secondo: più lento del giocatore, per non sembrare frettoloso. */
export const VELOCITA_VAGABONDAGGIO = 1.4

/** Raggio di giro predefinito, in celle, se l'NPC non ne dichiara uno suo. */
const RAGGIO_DEFAULT = 4

export interface StatoNpc {
  /** Posizione attuale, frazionaria. */
  pos: Griglia
  /** La cella verso cui si sta camminando, o null se fermo. */
  destinazione: Griglia | null
  /** Secondi che restano prima di scegliere la prossima mossa, da fermo. */
  attesa: number
}

export function statoInizialeNpc(npc: Npc, rng: () => number = Math.random): StatoNpc {
  return {
    pos: { x: npc.x + 0.5, y: npc.y + 0.5 },
    destinazione: null,
    // Sfalsato: altrimenti tutti gli NPC partirebbero nello stesso istante.
    attesa: attesaCasuale(rng),
  }
}

/** Avanza lo stato di un NPC di un frame. */
export function aggiornaNpc(
  npc: Npc,
  stato: StatoNpc,
  mappa: Cella[][],
  deltaSec: number,
  rng: () => number = Math.random,
): StatoNpc {
  if (stato.destinazione) return camminaVerso(stato, deltaSec, rng)

  const attesa = stato.attesa - deltaSec
  if (attesa > 0) return { ...stato, attesa }

  const prossima = prossimaCella(npc, stato, mappa, rng)
  if (!prossima) return { ...stato, attesa: attesaCasuale(rng) }

  return { ...stato, destinazione: { x: prossima.x + 0.5, y: prossima.y + 0.5 } }
}

function camminaVerso(stato: StatoNpc, deltaSec: number, rng: () => number): StatoNpc {
  const dest = stato.destinazione!
  const dx = dest.x - stato.pos.x
  const dy = dest.y - stato.pos.y
  const distanza = Math.hypot(dx, dy)
  const passo = VELOCITA_VAGABONDAGGIO * deltaSec

  if (distanza <= passo) {
    return { pos: dest, destinazione: null, attesa: attesaCasuale(rng) }
  }

  return {
    ...stato,
    pos: { x: stato.pos.x + (dx / distanza) * passo, y: stato.pos.y + (dy / distanza) * passo },
  }
}

const VICINI: Griglia[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** Una cella calpestabile e adiacente, entro il raggio di giro — o nessuna. */
function prossimaCella(
  npc: Npc,
  stato: StatoNpc,
  mappa: Cella[][],
  rng: () => number,
): Griglia | null {
  const cx = Math.floor(stato.pos.x)
  const cy = Math.floor(stato.pos.y)
  const raggio = npc.raggio ?? RAGGIO_DEFAULT

  const candidate = VICINI.map((v) => ({ x: cx + v.x, y: cy + v.y })).filter(
    (c) =>
      calpestabile(mappa, c.x + 0.5, c.y + 0.5) &&
      Math.hypot(c.x - npc.x, c.y - npc.y) <= raggio,
  )

  if (candidate.length === 0) return null
  return candidate[Math.floor(rng() * candidate.length)]
}

/** Tra un giro e l'altro, una sosta breve: non sono in marcia perenne. */
function attesaCasuale(rng: () => number): number {
  return 1.5 + rng() * 2.5
}
