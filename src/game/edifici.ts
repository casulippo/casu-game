import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../engine/iso'
import type { Luogo } from '../engine/luoghi'

/**
 * Gli edifici con un nome, visti dalla strada.
 *
 * Stesso linguaggio del resto della mappa: la pianta è il tetto, e sul lato
 * verso chi guarda scende una fascia di facciata. Niente facce oblique, niente
 * fotografie in prospettiva — e soprattutto la porta si disegna nella colonna
 * in cui il gioco la mette davvero, così quello che si vede e quello con cui si
 * interagisce sono la stessa cosa.
 */

interface Aspetto {
  tetto: number
  tettoOmbra: number
  facciata: number
  zoccolo: number
  infissi: number
  /** Un tetto a falde ha il colmo; uno piano ha il parapetto e gli sfiati. */
  falde: boolean
}

const ASPETTO: Record<string, Aspetto> = {
  casa: {
    tetto: 0xa8442f,
    tettoOmbra: 0x8c3626,
    facciata: 0xc9b89a,
    zoccolo: 0x8a7c66,
    infissi: 0x4a3b2c,
    falde: true,
  },
  supermercato: {
    tetto: 0x6f767f,
    tettoOmbra: 0x5c626a,
    facciata: 0xb0b6bd,
    zoccolo: 0x6c727a,
    infissi: 0x2f4f42,
    falde: false,
  },
}

/** Quanto è alta la fascia di facciata, secondo i piani. */
function altezzaFacciata(piani: number): number {
  return Math.min(38, 12 + piani * 9)
}

export interface EdificioDipinto {
  chiave: string
  ancora: { x: number; y: number }
}

export function disegnaLuogo(
  scena: Phaser.Scene,
  luogo: Luogo,
): EdificioDipinto | null {
  const aspetto = ASPETTO[luogo.tipo]
  if (!aspetto) return null

  const larghezza = luogo.larghezza * TILE_W
  const profondita = luogo.profondita * TILE_H
  const facciata = altezzaFacciata(luogo.piani)
  const alta = profondita + facciata

  const chiave = `luogo-${luogo.id}`
  const ancora = { x: 0.5, y: profondita / alta }
  if (scena.textures.exists(chiave)) return { chiave, ancora }

  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = alta

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  disegnaFacciata(ctx, luogo, aspetto, larghezza, profondita, facciata)
  if (aspetto.falde) tettoAFalde(ctx, aspetto, larghezza, profondita)
  else tettoPiano(ctx, aspetto, larghezza, profondita)

  scena.textures.addCanvas(chiave, tela)
  return { chiave, ancora }
}

/**
 * La facciata, con la porta dov'è davvero la soglia.
 *
 * Disegnata prima del tetto: così la gronda le sta sopra e l'edificio non
 * sembra un adesivo appiccicato al suolo.
 */
function disegnaFacciata(
  ctx: CanvasRenderingContext2D,
  luogo: Luogo,
  aspetto: Aspetto,
  larghezza: number,
  profondita: number,
  altezza: number,
) {
  ctx.fillStyle = css(aspetto.facciata)
  ctx.fillRect(0, profondita, larghezza, altezza)

  ctx.fillStyle = css(aspetto.zoccolo)
  ctx.fillRect(0, profondita + altezza - 4, larghezza, 4)

  // La porta cade nella colonna della soglia, non al centro per comodità.
  const colonna = Math.min(
    Math.max(luogo.porta.x - luogo.origine.x, 0),
    luogo.larghezza - 1,
  )
  const centroPorta = colonna * TILE_W + TILE_W / 2
  const larghezzaPorta = Math.min(18, TILE_W * 0.4)
  const altezzaPorta = altezza * 0.72

  ctx.fillStyle = css(aspetto.infissi)
  ctx.fillRect(
    centroPorta - larghezzaPorta / 2,
    profondita + altezza - altezzaPorta - 4,
    larghezzaPorta,
    altezzaPorta,
  )

  // Le finestre stanno nelle altre campate, una per cella.
  for (let c = 0; c < luogo.larghezza; c++) {
    if (c === colonna) continue

    const centro = c * TILE_W + TILE_W / 2
    const larghezzaFinestra = Math.min(20, TILE_W * 0.42)
    const altezzaFinestra = Math.min(14, altezza * 0.38)

    ctx.fillStyle = css(aspetto.infissi)
    ctx.fillRect(
      centro - larghezzaFinestra / 2,
      profondita + altezza * 0.28,
      larghezzaFinestra,
      altezzaFinestra,
    )
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(
      centro - larghezzaFinestra / 2 + 2,
      profondita + altezza * 0.28 + 2,
      larghezzaFinestra - 4,
      altezzaFinestra - 4,
    )
  }

  ctx.strokeStyle = css(scurisci(aspetto.facciata, 0.55))
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, profondita + 0.5, larghezza - 1, altezza - 1)
}

/** Tetto a falde: due spioventi che si incontrano sul colmo. */
function tettoAFalde(
  ctx: CanvasRenderingContext2D,
  aspetto: Aspetto,
  larghezza: number,
  profondita: number,
) {
  const colmo = profondita / 2

  ctx.fillStyle = css(aspetto.tetto)
  ctx.fillRect(0, 0, larghezza, colmo)
  ctx.fillStyle = css(aspetto.tettoOmbra)
  ctx.fillRect(0, colmo, larghezza, profondita - colmo)

  // I corsi di tegole: righe orizzontali, più fitte verso il colmo.
  ctx.fillStyle = 'rgba(0,0,0,0.13)'
  for (let y = 6; y < profondita; y += 7) ctx.fillRect(0, y, larghezza, 1)

  ctx.fillStyle = 'rgba(255,255,255,0.20)'
  ctx.fillRect(0, colmo - 1, larghezza, 2)

  // Il comignolo, spostato di lato: al centro sembrerebbe una decorazione.
  const comignolo = larghezza * 0.72
  ctx.fillStyle = css(aspetto.zoccolo)
  ctx.fillRect(comignolo, colmo - 14, 9, 12)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(comignolo, colmo - 14, 9, 3)

  bordo(ctx, larghezza, profondita, aspetto)
}

/** Tetto piano: parapetto attorno e macchinari sopra. */
function tettoPiano(
  ctx: CanvasRenderingContext2D,
  aspetto: Aspetto,
  larghezza: number,
  profondita: number,
) {
  ctx.fillStyle = css(aspetto.tetto)
  ctx.fillRect(0, 0, larghezza, profondita)

  ctx.fillStyle = css(aspetto.tettoOmbra)
  ctx.fillRect(0, 0, larghezza, 5)
  ctx.fillRect(0, profondita - 5, larghezza, 5)
  ctx.fillRect(0, 0, 5, profondita)
  ctx.fillRect(larghezza - 5, 0, 5, profondita)

  ctx.fillStyle = css(aspetto.zoccolo)
  for (const [fx, fy] of [
    [0.25, 0.3],
    [0.6, 0.55],
    [0.4, 0.72],
  ] as const) {
    ctx.fillRect(larghezza * fx, profondita * fy, 14, 10)
  }

  bordo(ctx, larghezza, profondita, aspetto)
}

function bordo(
  ctx: CanvasRenderingContext2D,
  larghezza: number,
  profondita: number,
  aspetto: Aspetto,
) {
  ctx.strokeStyle = css(scurisci(aspetto.tettoOmbra, 0.6))
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, larghezza - 2, profondita - 2)
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

function scurisci(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}
