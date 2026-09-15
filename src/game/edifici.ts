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
  // Le tre botteghe hanno il tetto piano: sono banconi in mezzo alle case,
  // non case a loro volta, e il colore basta a distinguerle da lontano.
  bazar: {
    tetto: 0x8c6f3f,
    tettoOmbra: 0x74592f,
    facciata: 0xd8c38f,
    zoccolo: 0x8a7247,
    infissi: 0x3b2f22,
    falde: false,
  },
  armeria: {
    tetto: 0x4f5a55,
    tettoOmbra: 0x3f4a46,
    facciata: 0x9aa39c,
    zoccolo: 0x6a736c,
    infissi: 0x2b3330,
    falde: false,
  },
  'mercato-nero': {
    tetto: 0x4a3f5c,
    tettoOmbra: 0x3b3149,
    facciata: 0x9b93a8,
    zoccolo: 0x6b6377,
    infissi: 0x241f2e,
    falde: false,
  },
}

/**
 * Quanto la facciata scende sotto la pianta, in pixel.
 *
 * È fissa: la fascia che sborda occupa i due terzi della cella della soglia,
 * dove si ferma chi entra. Se crescesse con i piani, un palazzo alto
 * finirebbe col coprire il marciapiede davanti a sé.
 */
const SPORGENZA_FACCIATA = 34

/**
 * Quanto è alto il muro di facciata, secondo i piani.
 *
 * Più alto di quanto sborda: la parte in eccesso sale sopra la pianta,
 * mangiando la falda bassa del tetto. Serve perché la porta ci stia dentro
 * tutta, e una porta deve essere alta almeno quanto chi ci passa — un
 * personaggio è alto una cella scarsa.
 */
function altezzaFacciata(piani: number): number {
  return Math.min(60, 40 + piani * 7)
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
  const alta = profondita + SPORGENZA_FACCIATA

  const chiave = `luogo-${luogo.id}`
  const ancora = { x: 0.5, y: profondita / alta }
  if (scena.textures.exists(chiave)) return { chiave, ancora }

  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = alta

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  // Il tetto per primo, su tutta la pianta: la facciata poi gli sale sopra
  // fin dove arriva il muro, e la gronda chiude la giunzione.
  if (aspetto.falde) tettoAFalde(ctx, aspetto, larghezza, profondita)
  else tettoPiano(ctx, aspetto, larghezza, profondita)
  disegnaFacciata(ctx, luogo, aspetto, larghezza, profondita, facciata)

  scena.textures.addCanvas(chiave, tela)
  return { chiave, ancora }
}

/**
 * La facciata, con la porta dov'è davvero la soglia.
 *
 * Il muro poggia sul filo inferiore della sporgenza e sale da lì: quando è
 * più alto di quanto sborda, la differenza copre la parte bassa del tetto.
 */
function disegnaFacciata(
  ctx: CanvasRenderingContext2D,
  luogo: Luogo,
  aspetto: Aspetto,
  larghezza: number,
  profondita: number,
  altezza: number,
) {
  const base = profondita + SPORGENZA_FACCIATA
  const cima = base - altezza

  ctx.fillStyle = css(aspetto.facciata)
  ctx.fillRect(0, cima, larghezza, altezza)

  ctx.fillStyle = css(aspetto.zoccolo)
  ctx.fillRect(0, base - 4, larghezza, 4)

  // La gronda: il tetto sporge di un dito sul muro, altrimenti l'edificio
  // sembra un adesivo appiccicato al suolo.
  ctx.fillStyle = css(scurisci(aspetto.tetto, 0.7))
  ctx.fillRect(0, cima - 3, larghezza, 3)

  // La porta cade nella colonna della soglia, non al centro per comodità.
  const colonna = Math.min(
    Math.max(luogo.porta.x - luogo.origine.x, 0),
    luogo.larghezza - 1,
  )
  const centroPorta = colonna * TILE_W + TILE_W / 2
  const larghezzaPorta = Math.min(24, TILE_W * 0.5)
  // Tutta l'altezza del muro meno lo zoccolo: è la porta a dare la scala
  // all'edificio, e chi la guarda ci confronta il proprio personaggio.
  const altezzaPorta = altezza - 6

  ctx.fillStyle = css(aspetto.infissi)
  ctx.fillRect(
    centroPorta - larghezzaPorta / 2,
    base - 4 - altezzaPorta,
    larghezzaPorta,
    altezzaPorta,
  )

  // Le finestre stanno nelle altre campate, una per cella, in alto sul muro.
  for (let c = 0; c < luogo.larghezza; c++) {
    if (c === colonna) continue

    const centro = c * TILE_W + TILE_W / 2
    const larghezzaFinestra = Math.min(22, TILE_W * 0.45)
    const altezzaFinestra = Math.min(18, altezza * 0.3)
    const altoFinestra = cima + 8

    ctx.fillStyle = css(aspetto.infissi)
    ctx.fillRect(
      centro - larghezzaFinestra / 2,
      altoFinestra,
      larghezzaFinestra,
      altezzaFinestra,
    )
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(
      centro - larghezzaFinestra / 2 + 2,
      altoFinestra + 2,
      larghezzaFinestra - 4,
      altezzaFinestra - 4,
    )
  }

  ctx.strokeStyle = css(scurisci(aspetto.facciata, 0.55))
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, cima + 0.5, larghezza - 1, altezza - 1)
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
