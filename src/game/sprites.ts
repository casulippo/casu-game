import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../engine/iso'

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
 * disegna a costo quasi nullo. È anche la stessa forma che avranno gli sprite
 * veri, quindi il codice non cambierà più quando arriveranno.
 */

/** Margine sopra il pezzo, per ombre e sporgenze. */
const MARGINE = 4

interface Colori {
  sinistra: number
  destra: number
  sopra: number
}

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

function poligono(ctx: CanvasRenderingContext2D, punti: number[], colore: string) {
  ctx.fillStyle = colore
  ctx.beginPath()
  ctx.moveTo(punti[0], punti[1])
  for (let i = 2; i < punti.length; i += 2) ctx.lineTo(punti[i], punti[i + 1])
  ctx.closePath()
  ctx.fill()
}

/**
 * Un prisma isometrico alto `altezza`, largo una cella.
 * L'origine dell'immagine è il centro della cella alla base.
 */
export function texturaPrisma(
  scena: Phaser.Scene,
  chiave: string,
  altezza: number,
  colori: Colori,
  extra?: (ctx: CanvasRenderingContext2D, cx: number, base: number) => void,
): string {
  if (scena.textures.exists(chiave)) return chiave

  const h = Math.max(1, Math.round(altezza))
  const larghezza = TILE_W
  const alta = h + TILE_H + MARGINE * 2

  const { canvas, ctx } = tela(larghezza, alta)
  if (!ctx) return chiave

  // Centro della cella alla base, dentro il canvas.
  const cx = larghezza / 2
  const base = alta - MARGINE - TILE_H / 2

  const mw = TILE_W / 2
  const mh = TILE_H / 2

  // Faccia sinistra.
  poligono(
    ctx,
    [cx - mw, base - h, cx - mw, base, cx, base + mh, cx, base + mh - h],
    css(colori.sinistra),
  )
  // Faccia destra.
  poligono(
    ctx,
    [cx, base + mh - h, cx, base + mh, cx + mw, base, cx + mw, base - h],
    css(colori.destra),
  )
  // Piano superiore.
  poligono(
    ctx,
    [cx, base - mh - h, cx + mw, base - h, cx, base + mh - h, cx - mw, base - h],
    css(colori.sopra),
  )

  extra?.(ctx, cx, base)

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}

/**
 * L'ancoraggio da usare per le immagini generate da `texturaPrisma`,
 * così che il centro della cella cada dove ci si aspetta.
 */
export function ancoraPrisma(altezza: number): { x: number; y: number } {
  const h = Math.max(1, Math.round(altezza))
  const alta = h + TILE_H + MARGINE * 2
  return { x: 0.5, y: (alta - MARGINE - TILE_H / 2) / alta }
}

/** Le finestre di un edificio, in una texture a parte da accendere la sera. */
export function texturaFinestre(
  scena: Phaser.Scene,
  chiave: string,
  altezza: number,
  piani: number,
  colore: number,
  seme: number,
): string {
  if (scena.textures.exists(chiave)) return chiave

  const h = Math.max(1, Math.round(altezza))
  const alta = h + TILE_H + MARGINE * 2
  const { canvas, ctx } = tela(TILE_W, alta)
  if (!ctx) return chiave

  const cx = TILE_W / 2
  const base = alta - MARGINE - TILE_H / 2
  const passo = h / Math.max(1, piani)

  ctx.fillStyle = css(colore)
  for (let piano = 0; piano < piani; piano++) {
    if (Math.sin(seme * 3.1 + piano * 2.3) < 0.15) continue
    const y = base - piano * passo - passo * 0.7
    ctx.fillRect(cx + 5, y, 6, 8)
    ctx.fillRect(cx - 11, y, 6, 8)
  }

  scena.textures.addCanvas(chiave, canvas)
  return chiave
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

  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(cx, base + 2, TILE_W * 0.17, TILE_H * 0.17, 0, 0, Math.PI * 2)
  ctx.fill()

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
