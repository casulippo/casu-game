import Phaser from 'phaser'
import { TILE_H, TILE_W, grigliaASchermo } from '../engine/iso'
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

      // Con la vista dall'alto la cella è un quadrato, quindi non serve
      // ritagliarla: basta prelevare un pezzo di texture della misura giusta.

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

export interface SuoloDipinto {
  chiave: string
  /** Dove va posizionata l'immagine, in coordinate schermo. */
  x: number
  y: number
}

/**
 * Dipinge l'intero suolo su una sola immagine.
 *
 * Una cella per oggetto significava migliaia di sprite: pesante, e con i bordi
 * che vibravano di un pixel a seconda della posizione della camera, facendo
 * "ondeggiare" il terreno. Dipingendo tutto una volta sola su un canvas, resta
 * un oggetto solo e le giunzioni sono fisse per sempre.
 */
export function costruisciSuolo(
  scena: Phaser.Scene,
  lato: number,
  descriviCella: (
    x: number,
    y: number,
  ) => {
    materiale: Materiale | null
    rialzo: number
    coloreCordolo: number | null
    /** Usato al posto della texture, per le superfici senza materiale. */
    coloreFisso?: number
  },
): SuoloDipinto | null {
  const chiave = 'suolo-citta'
  if (scena.textures.exists(chiave)) scena.textures.remove(chiave)

  const larghezza = lato * TILE_W
  const margine = TILE_H * 2
  const altezza = lato * TILE_H + margine

  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = altezza

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  // L'origine del disegno: l'angolo più a sinistra e più in alto della mappa.
  const originaX = -TILE_W / 2
  const originaY = -TILE_H / 2

  // Con la vista dall'alto le celle non si sovrappongono: basta scorrerle in
  // ordine di riga, e i gradini si disegnano prima del piano che li sovrasta.
  for (let y = 0; y < lato; y++) {
    for (let x = 0; x < lato; x++) {
      const info = descriviCella(x, y)
      const { sx, sy } = grigliaASchermo({ x, y })
      const px = sx - originaX
      const py = sy - originaY

      // Superfici senza texture, come il mare: un quadrato di colore pieno.
      if (!info.materiale) {
        if (info.coloreFisso === undefined) continue
        ctx.fillStyle = css(info.coloreFisso)
        ctx.fillRect(px - TILE_W / 2, py - TILE_H / 2, TILE_W, TILE_H)
        continue
      }

      if (info.coloreCordolo !== null && info.rialzo > 0) {
        disegnaFacce(ctx, px, py, info.rialzo, info.coloreCordolo)
      }

      const sorgente = scena.textures
        .get(nomeTile(info.materiale, varianteDi(x, y)))
        .getSourceImage() as CanvasImageSource

      ctx.drawImage(sorgente, px - TILE_W / 2, py - TILE_H / 2 - info.rialzo)
    }
  }

  scena.textures.addCanvas(chiave, tela)
  return { chiave, x: originaX, y: originaY }
}

/**
 * Il fronte del gradino di marciapiede.
 *
 * Dall'alto se ne vede solo il lato rivolto verso chi guarda, cioè quello in
 * basso: è quella striscia a rendere il marciapiede rialzato invece che
 * dipinto sull'asfalto.
 */
function disegnaFacce(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  altezza: number,
  tinta: number,
) {
  ctx.fillStyle = css(scala(tinta, 0.62))
  ctx.fillRect(px - TILE_W / 2, py + TILE_H / 2 - altezza, TILE_W, altezza)
}

function scala(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
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
