import Phaser from 'phaser'
import { TILE_W } from '../engine/iso'
import type { TipoArredo } from '../engine/arredo'
import { preparaFoglio } from './ritaglio'

/**
 * Gli sprite dell'arredo di periferia, ritagliati da un unico foglio.
 *
 * Chiedere a un generatore un foglio a griglia regolare costa una generazione
 * invece di sei, e i riquadri si ritagliano meccanicamente. Gli edifici restano
 * invece immagini singole: in griglia sarebbero troppo piccoli per reggere il
 * dettaglio.
 */

const COLONNE = 3
const RIGHE = 2

/** L'ordine di lettura del foglio: sinistra-destra, riga per riga. */
const ORDINE: TipoArredo[] = [
  'bidone-fuoco',
  'rifiuti',
  'cartoni',
  'auto-rottame',
  'palo-storto',
  'panni',
]

/** Quante celle occupa ogni pezzo, per dargli la scala giusta. */
const SCALA: Partial<Record<TipoArredo, number>> = {
  'bidone-fuoco': 0.55,
  rifiuti: 0.85,
  cartoni: 0.8,
  'auto-rottame': 1.5,
  'palo-storto': 1.1,
  panni: 1.4,
}

/** I pezzi che fanno luce di notte. */
export const LUMINOSI: Partial<Record<TipoArredo, { raggio: number; forza: number }>> = {
  'bidone-fuoco': { raggio: 52, forza: 0.5 },
}

export function caricaArredo(scena: Phaser.Scene) {
  scena.load.image('arr-src-slum', 'arredo/slum.jpg')
}

export interface PezzoPronto {
  chiave: string
  frame: number
  scala: number
}

const pronti = new Map<TipoArredo, PezzoPronto>()

export function preparaArredo(scena: Phaser.Scene) {
  pronti.clear()

  // Riquadri generosi: la riduzione fine avviene poi con la scala dello sprite.
  const foglio = preparaFoglio(scena, 'arr-src-slum', 'arr-slum', COLONNE, RIGHE, 128)
  if (!foglio) return

  ORDINE.forEach((tipo, indice) => {
    pronti.set(tipo, {
      chiave: foglio.chiave,
      frame: indice,
      scala: ((SCALA[tipo] ?? 1) * TILE_W) / foglio.larghezzaRiquadro,
    })
  })
}

export function pezzoPer(tipo: TipoArredo): PezzoPronto | null {
  return pronti.get(tipo) ?? null
}
