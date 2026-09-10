import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../engine/iso'
import { DIREZIONE_OMBRA } from './scenes/comuni'

/**
 * Genera texture per gli elementi statici della scena.
 *
 * Perché non disegnarli direttamente: un oggetto `Graphics` ricostruisce la
 * propria geometria a ogni frame. Con centinaia di edifici significa migliaia
 * di poligoni ricalcolati sessanta volte al secondo, ed è ciò che rende il
 * movimento a scatti.
 *
 * Disegnando ogni pezzo una volta sola in una texture, ogni istanza diventa
 * un'immagine: un quadrato con sopra un'immagine, che la scheda grafica
 * disegna a costo quasi nullo.
 *
 * Tutto qui è piatto, guardato dall'alto: nessuna faccia obliqua. L'unica
 * concessione alla profondità è una fascia di facciata sul lato verso chi
 * guarda, la stessa tecnica del cordolo dei marciapiedi in `terreno.ts` — così
 * la mappa resta un solo linguaggio visivo invece di due mescolati.
 */

/** Margine sopra il pezzo, per ombre e sporgenze. */
const MARGINE = 4

function tela(larghezza: number, altezza: number) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(larghezza)
  c.height = Math.ceil(altezza)
  const ctx = c.getContext('2d')
  if (ctx) ctx.imageSmoothingEnabled = false
  return { canvas: c, ctx }
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

function scala(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}

export interface ColoriVolume {
  tetto: number
  facciata: number
  /** Se manca, si ricava scurendo il tetto. */
  bordo?: number
}

/**
 * Un volume visto dall'alto: pianta rettangolare (o a ellisse), con una
 * fascia di facciata sul lato verso chi guarda a dare il senso dell'altezza.
 * Usata per edifici, lampioni e arredo: uno stile solo per tutto ciò che sta
 * sopra il terreno.
 */
export function texturaVolume(
  scena: Phaser.Scene,
  chiave: string,
  larghezzaPx: number,
  profonditaPx: number,
  altezzaFacciata: number,
  colori: ColoriVolume,
  opzioni?: {
    forma?: 'rettangolo' | 'ellisse'
    extra?: (ctx: CanvasRenderingContext2D, larghezza: number, altezzaTetto: number) => void
  },
): string {
  if (scena.textures.exists(chiave)) return chiave

  const larghezza = Math.max(1, Math.round(larghezzaPx))
  const altezzaTetto = Math.max(1, Math.round(profonditaPx))
  const h = Math.max(0, Math.round(altezzaFacciata))
  const alta = altezzaTetto + h

  const { canvas, ctx } = tela(larghezza, alta)
  if (!ctx) return chiave

  const forma = opzioni?.forma ?? 'rettangolo'
  const bordo = colori.bordo ?? scala(colori.tetto, 0.55)

  const sagoma = () => {
    ctx.beginPath()
    if (forma === 'ellisse') {
      ctx.ellipse(larghezza / 2, alta / 2, larghezza / 2, alta / 2, 0, 0, Math.PI * 2)
    } else {
      ctx.rect(0, 0, larghezza, alta)
    }
  }

  // Il tetto copre tutta la sagoma; la facciata si sovrappone sulla fascia
  // inferiore, come il cordolo del marciapiede si sovrappone all'asfalto.
  ctx.save()
  sagoma()
  ctx.clip()
  ctx.fillStyle = css(colori.tetto)
  ctx.fillRect(0, 0, larghezza, alta)
  if (h > 0) {
    ctx.fillStyle = css(colori.facciata)
    ctx.fillRect(0, altezzaTetto, larghezza, h)
  }
  ctx.restore()

  ctx.strokeStyle = css(bordo)
  ctx.lineWidth = 1
  sagoma()
  ctx.stroke()

  if (h > 0 && forma === 'rettangolo') {
    ctx.strokeStyle = css(bordo)
    ctx.beginPath()
    ctx.moveTo(0, altezzaTetto + 0.5)
    ctx.lineTo(larghezza, altezzaTetto + 0.5)
    ctx.stroke()
  }

  opzioni?.extra?.(ctx, larghezza, altezzaTetto)

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}

/** L'ancoraggio per `texturaVolume`: il punto è il centro del lato in basso. */
export function ancoraVolume(
  profonditaPx: number,
  altezzaFacciata: number,
): { x: number; y: number } {
  const altezzaTetto = Math.max(1, Math.round(profonditaPx))
  const h = Math.max(0, Math.round(altezzaFacciata))
  return { x: 0.5, y: altezzaTetto / (altezzaTetto + h) }
}

/** Un albero, con chioma e ombra. */
export function texturaAlbero(scena: Phaser.Scene): string {
  const chiave = 'sp-albero'
  if (scena.textures.exists(chiave)) return chiave

  const alta = 60 + TILE_H + MARGINE * 2
  const { canvas, ctx } = tela(TILE_W, alta)
  if (!ctx) return chiave

  const cx = TILE_W / 2
  const base = alta - MARGINE - TILE_H / 2

  // L'ombra cade dallo stesso sole di personaggi e edifici: da alto-sinistra,
  // allungata verso basso-destra. Un'ombra centrata sotto la chioma
  // tradirebbe subito che ogni oggetto ha la sua luce per conto suo.
  ctx.fillStyle = 'rgba(0,0,0,0.26)'
  ctx.save()
  ctx.translate(cx + DIREZIONE_OMBRA.x * 14, base + 2 + DIREZIONE_OMBRA.y * 14)
  ctx.rotate(Math.atan2(DIREZIONE_OMBRA.y, DIREZIONE_OMBRA.x))
  ctx.beginPath()
  ctx.ellipse(0, 0, TILE_W * 0.24, TILE_H * 0.13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = css(0x53422f)
  ctx.fillRect(cx - 3, base - 28, 6, 28)

  for (const [dx, dy, r, colore] of [
    [0, -36, 16, 0x2f6039],
    [-6, -42, 11, 0x3d7a48],
    [5, -45, 7, 0x4d9257],
  ] as const) {
    ctx.fillStyle = css(colore)
    ctx.beginPath()
    ctx.arc(cx + dx, base + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}

/** L'ancoraggio per `texturaAlbero`: il centro della cella alla base. */
export function ancoraAlbero(): { x: number; y: number } {
  const alta = 60 + TILE_H + MARGINE * 2
  return { x: 0.5, y: (alta - MARGINE - TILE_H / 2) / alta }
}

/** Un lampione visto dall'alto: solo il cerchio della lampada e la sua ombra. */
export function texturaLampione(scena: Phaser.Scene): string {
  const chiave = 'sp-lampione'
  if (scena.textures.exists(chiave)) return chiave

  const lato = 16
  const { canvas, ctx } = tela(lato, lato)
  if (!ctx) return chiave

  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(lato / 2, lato / 2 + 3, 5, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = css(0x454d5b)
  ctx.beginPath()
  ctx.arc(lato / 2, lato / 2, 4.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = css(0xffdca0)
  ctx.beginPath()
  ctx.arc(lato / 2, lato / 2, 2, 0, Math.PI * 2)
  ctx.fill()

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}

/** L'alone di luce di un lampione, da sovrapporre in modo additivo. */
export function texturaAlone(scena: Phaser.Scene, raggio: number): string {
  const chiave = `sp-alone-${raggio}`
  if (scena.textures.exists(chiave)) return chiave

  const lato = raggio * 2
  const { canvas, ctx } = tela(lato, lato)
  if (!ctx) return chiave

  const sfumatura = ctx.createRadialGradient(
    raggio,
    raggio,
    0,
    raggio,
    raggio,
    raggio,
  )
  sfumatura.addColorStop(0, 'rgba(255,196,107,0.85)')
  sfumatura.addColorStop(0.5, 'rgba(255,196,107,0.28)')
  sfumatura.addColorStop(1, 'rgba(255,196,107,0)')

  ctx.fillStyle = sfumatura
  ctx.fillRect(0, 0, lato, lato)

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}
