import Phaser from 'phaser'
import { TILE_W } from '../engine/iso'
import type { Quartiere } from '../engine/state'
import { preparaSprite } from './ritaglio'

/**
 * Gli sprite degli edifici, uno per carattere di quartiere.
 *
 * Ogni zona ha il proprio repertorio: le baracche in periferia, i palazzi in
 * centro, le torri di vetro nella zona ricca. È ciò che rende un quartiere
 * riconoscibile appena ci si entra.
 */

export interface ModelloEdificio {
  file: string
  /** Quante celle occupa il fronte: determina la scala a schermo. */
  celle: number
}

const MODELLI: Record<string, ModelloEdificio> = {
  baracca: { file: 'baracca', celle: 2 },
  'baracca-rovinata': { file: 'baracca-rovinata', celle: 2 },
  capannone: { file: 'capannone', celle: 2.6 },
  'palazzo-centro': { file: 'palazzo-centro', celle: 2.2 },
  'club-notturno': { file: 'club-notturno', celle: 2.6 },
  'torre-vetro': { file: 'torre-vetro', celle: 2.4 },
  villetta: { file: 'villetta', celle: 2.6 },
}

/** Il repertorio di ogni quartiere. */
const REPERTORIO: Record<Quartiere, string[]> = {
  porto: ['capannone'],
  periferia: ['baracca', 'baracca-rovinata'],
  centro: ['palazzo-centro'],
  notturna: ['club-notturno'],
  ricca: ['torre-vetro'],
  residenziale: ['villetta'],
}

export function caricaEdifici(scena: Phaser.Scene) {
  for (const modello of Object.values(MODELLI)) {
    scena.load.image(`ed-src-${modello.file}`, `edifici/${modello.file}.jpg`)
  }
}

export interface EdificioPronto {
  chiave: string
  larghezza: number
  altezza: number
}

const pronti = new Map<string, EdificioPronto>()

/** Ripulisce e ridimensiona tutti gli edifici. Da chiamare una volta sola. */
export function preparaEdifici(scena: Phaser.Scene) {
  pronti.clear()

  for (const [nome, modello] of Object.entries(MODELLI)) {
    const risultato = preparaSprite(
      scena,
      `ed-src-${modello.file}`,
      `ed-${modello.file}`,
      modello.celle * TILE_W,
    )
    if (risultato) {
      pronti.set(nome, {
        chiave: risultato.chiave,
        larghezza: risultato.larghezza,
        altezza: risultato.altezza,
      })
    }
  }
}

/**
 * L'edificio da mettere in questa cella.
 *
 * La scelta è deterministica: la stessa cella dà sempre lo stesso edificio,
 * così la città non cambia aspetto a ogni caricamento.
 */
export function edificioPer(
  quartiere: Quartiere,
  x: number,
  y: number,
): EdificioPronto | null {
  const repertorio = REPERTORIO[quartiere]
  if (!repertorio?.length) return null

  const rumore = Math.sin(x * 17.31 + y * 43.71) * 6271.13
  const indice = Math.floor((rumore - Math.floor(rumore)) * repertorio.length)

  return pronti.get(repertorio[indice]) ?? null
}
