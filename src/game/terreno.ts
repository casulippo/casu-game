import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../engine/iso'
import type { Pavimentazione } from '../engine/quartieri'

/**
 * Dalle texture quadrate ai tile isometrici.
 *
 * Le texture sorgenti sono quadrate e ripetibili: chiedere a un generatore
 * rombi isometrici perfetti non funziona, mentre le texture tileable riescono
 * bene. Il rombo lo ritagliamo qui, a runtime.
 */

export const MATERIALI = {
  asfalto: 'asfalto',
  ciottolato: 'ciottolato',
  sterrato: 'sterrato',
  lastricato: 'lastricato',
  erba: 'erba',
} as const

export type Materiale = keyof typeof MATERIALI

/**
 * Quante varianti generare per materiale.
 *
 * Ogni variante ritaglia un punto diverso della texture sorgente: senza, la
 * ripetizione dello stesso rombo si nota subito come un motivo regolare.
 */
const VARIANTI = 6

export function caricaTexture(scena: Phaser.Scene) {
  for (const nome of Object.keys(MATERIALI) as Materiale[]) {
    scena.load.image(`tex-${nome}`, `textures/${nome}.jpg`)
  }
}

/**
 * Ritaglia ogni texture in `VARIANTI` rombi isometrici, pronti da stampare
 * sulla mappa. Va chiamata una volta sola, dopo il caricamento.
 */
export function preparaTile(scena: Phaser.Scene) {
  for (const nome of Object.keys(MATERIALI) as Materiale[]) {
    const sorgente = scena.textures.get(`tex-${nome}`).getSourceImage()
    const larghezzaSorgente = (sorgente as HTMLImageElement).width
    const altezzaSorgente = (sorgente as HTMLImageElement).height

    for (let v = 0; v < VARIANTI; v++) {
      const chiave = nomeTile(nome, v)
      if (scena.textures.exists(chiave)) continue

      // Canvas costruito a mano e registrato come texture: è la via più
      // elementare, senza dipendere dall'implementazione interna del motore.
      const tela = document.createElement('canvas')
      tela.width = TILE_W
      tela.height = TILE_H

      const ctx = tela.getContext('2d')
      if (!ctx) continue

      ctx.imageSmoothingEnabled = false
      ctx.save()

      // Il rombo isometrico: la maschera che dà la forma al tile.
      ctx.beginPath()
      ctx.moveTo(TILE_W / 2, 0)
      ctx.lineTo(TILE_W, TILE_H / 2)
      ctx.lineTo(TILE_W / 2, TILE_H)
      ctx.lineTo(0, TILE_H / 2)
      ctx.closePath()
      ctx.clip()

      // Un punto di partenza diverso per ogni variante, per rompere la regolarità.
      const ox = Math.floor((v * 97) % Math.max(1, larghezzaSorgente - TILE_W))
      const oy = Math.floor((v * 53) % Math.max(1, altezzaSorgente - TILE_H))

      ctx.drawImage(
        sorgente as CanvasImageSource,
        ox,
        oy,
        TILE_W,
        TILE_H,
        0,
        0,
        TILE_W,
        TILE_H,
      )

      ctx.restore()
      scena.textures.addCanvas(chiave, tela)
    }
  }
}

export function nomeTile(materiale: Materiale, variante: number): string {
  return `tile-${materiale}-${variante}`
}

/** La variante da usare per una cella: stabile, così la mappa non sfarfalla. */
export function varianteDi(x: number, y: number): number {
  const rumore = Math.sin(x * 27.13 + y * 61.79) * 8123.77
  return Math.floor((rumore - Math.floor(rumore)) * VARIANTI)
}

/** Il materiale della carreggiata, secondo la pavimentazione del quartiere. */
export function materialeStrada(pav: Pavimentazione): Materiale {
  switch (pav) {
    case 'sterrato':
      return 'sterrato'
    case 'ciottolato':
      return 'ciottolato'
    case 'lastricato':
      return 'lastricato'
    default:
      return 'asfalto'
  }
}

/** Il materiale del marciapiede. */
export function materialeMarciapiede(pav: Pavimentazione): Materiale {
  switch (pav) {
    case 'sterrato':
      return 'sterrato'
    case 'ciottolato':
      return 'ciottolato'
    default:
      return 'lastricato'
  }
}
