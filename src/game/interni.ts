import Phaser from 'phaser'
import { TILE_H, TILE_W, grigliaASchermo } from '../engine/iso'
import type { Interno, Mobile } from '../engine/interni'

/**
 * Come si disegna una casa vista dall'alto.
 *
 * Stesso linguaggio della città: pianta piatta, e una fascia di parete sul
 * lato rivolto a chi guarda a dare lo spessore. Il colore lo mette il codice,
 * la grana è una velatura di puntini — nessuna fotografia, nessun asset da
 * licenziare.
 *
 * Il pavimento e i muri finiscono su un'unica immagine: una stanza sono
 * duecento celle, e duecento oggetti separati sarebbero duecento disegni per
 * fotogramma per una cosa che non si muove mai.
 */

/** Quanto sporge in basso la parete verso chi guarda. */
const SPESSORE_PARETE = 14

/** Margine attorno alla stanza, per contenere la parete che sporge. */
const MARGINE = SPESSORE_PARETE + 4

const COLORI = {
  pavimento: 0x8a6a47,
  pavimentoScuro: 0x7d5f3f,
  parete: 0xb8a382,
  pareteFronte: 0x6d5c45,
  battiscopa: 0x5a4a37,
  soglia: 0xc9a15b,
}

export interface StanzaDipinta {
  chiave: string
  x: number
  y: number
}

export function costruisciStanza(
  scena: Phaser.Scene,
  interno: Interno,
): StanzaDipinta | null {
  const chiave = `stanza-${interno.casa.id}`
  if (scena.textures.exists(chiave)) scena.textures.remove(chiave)

  const colonne = interno.celle[0].length
  const righe = interno.celle.length

  const tela = document.createElement('canvas')
  tela.width = colonne * TILE_W
  tela.height = righe * TILE_H + MARGINE

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  for (let y = 0; y < righe; y++) {
    for (let x = 0; x < colonne; x++) {
      const cella = interno.celle[y][x]
      const sinistra = x * TILE_W
      const alto = y * TILE_H

      if (cella === 'muro') {
        disegnaParete(ctx, interno, x, y, sinistra, alto)
        continue
      }

      ctx.fillStyle = css(cella === 'uscita' ? COLORI.soglia : COLORI.pavimento)
      ctx.fillRect(sinistra, alto, TILE_W, TILE_H)

      if (cella === 'pavimento') disegnaTavolato(ctx, sinistra, alto, x, y)
    }
  }

  scena.textures.addCanvas(chiave, tela)

  const { sx, sy } = grigliaASchermo({ x: 0, y: 0 })
  return { chiave, x: sx - TILE_W / 2, y: sy - TILE_H / 2 }
}

/**
 * Un muro.
 *
 * Dall'alto se ne vede la sommità; il fronte si disegna solo se sotto c'è
 * qualcosa in cui affacciarsi, altrimenti sarebbe una parete che sporge dentro
 * un altro muro.
 */
function disegnaParete(
  ctx: CanvasRenderingContext2D,
  interno: Interno,
  x: number,
  y: number,
  sinistra: number,
  alto: number,
) {
  const sotto = interno.celle[y + 1]?.[x]
  const affaccia = sotto !== undefined && sotto !== 'muro'

  if (affaccia) {
    ctx.fillStyle = css(COLORI.pareteFronte)
    ctx.fillRect(sinistra, alto + TILE_H, TILE_W, SPESSORE_PARETE)
    ctx.fillStyle = css(COLORI.battiscopa)
    ctx.fillRect(sinistra, alto + TILE_H + SPESSORE_PARETE - 3, TILE_W, 3)
  }

  ctx.fillStyle = css(COLORI.parete)
  ctx.fillRect(sinistra, alto, TILE_W, TILE_H)

  ctx.fillStyle = 'rgba(0,0,0,0.16)'
  ctx.fillRect(sinistra, alto, TILE_W, 2)

  // Uno spigolo scuro sui lati che danno sulla stanza: senza, il muro e il
  // pavimento sfumano l'uno nell'altro e la pianta si legge a fatica.
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  if (dentroLaStanza(interno, x - 1, y)) ctx.fillRect(sinistra, alto, 2, TILE_H)
  if (dentroLaStanza(interno, x + 1, y)) {
    ctx.fillRect(sinistra + TILE_W - 2, alto, 2, TILE_H)
  }
  if (dentroLaStanza(interno, x, y - 1)) ctx.fillRect(sinistra, alto, TILE_W, 2)
}

function dentroLaStanza(interno: Interno, x: number, y: number): boolean {
  const cella = interno.celle[y]?.[x]
  return cella !== undefined && cella !== 'muro'
}

/**
 * Il tavolato del pavimento.
 *
 * Le doghe corrono per tutta la stanza, quindi la tinta dipende solo dalla
 * riga: farla dipendere anche dalla colonna dava una scacchiera, che è
 * esattamente ciò che un pavimento di legno non è. Le teste delle assi cadono
 * a intervalli irregolari, così le fughe non si allineano in colonne.
 */
function disegnaTavolato(
  ctx: CanvasRenderingContext2D,
  sinistra: number,
  alto: number,
  x: number,
  y: number,
) {
  const assi = 3
  const passo = TILE_H / assi

  for (let i = 0; i < assi; i++) {
    const doga = y * assi + i
    ctx.fillStyle = css(doga % 2 === 0 ? COLORI.pavimento : COLORI.pavimentoScuro)
    ctx.fillRect(sinistra, alto + i * passo, TILE_W, passo)

    // La fuga lunga tra una doga e l'altra.
    ctx.fillStyle = 'rgba(0,0,0,0.14)'
    ctx.fillRect(sinistra, alto + i * passo, TILE_W, 1)

    // La testa dell'asse: c'è solo ogni tanto, e mai incolonnata con la vicina.
    if ((x * 7 + doga * 13) % 4 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(sinistra + ((doga * 17) % TILE_W), alto + i * passo, 1, passo)
    }
  }
}

export interface MobileDipinto {
  chiave: string
  ancora: { x: number; y: number }
}

/** L'aspetto di ogni mobile: pianta, fronte, e i dettagli che lo fanno leggere. */
const ASPETTO_MOBILE: Record<
  string,
  { sopra: number; fronte: number; altezza: number; dettaglio: Dettaglio }
> = {
  L: { sopra: 0xb9c3d4, fronte: 0x6f4a3c, altezza: 10, dettaglio: 'letto' },
  C: { sopra: 0xa8adb5, fronte: 0x7c6a52, altezza: 16, dettaglio: 'cucina' },
  N: { sopra: 0x8a6a4a, fronte: 0x6b5138, altezza: 18, dettaglio: 'armadio' },
  T: { sopra: 0x9c7550, fronte: 0x6f5238, altezza: 12, dettaglio: 'tavolo' },
  D: { sopra: 0x6a6f8c, fronte: 0x4c5069, altezza: 12, dettaglio: 'divano' },
}

type Dettaglio = 'letto' | 'cucina' | 'armadio' | 'tavolo' | 'divano'

export function disegnaMobile(
  scena: Phaser.Scene,
  mobile: Mobile,
): MobileDipinto | null {
  const aspetto = ASPETTO_MOBILE[mobile.simbolo]
  if (!aspetto) return null

  const chiave = `mobile-${mobile.simbolo}-${mobile.larghezza}x${mobile.altezza}`
  const larghezza = mobile.larghezza * TILE_W
  const profonditaPx = mobile.altezza * TILE_H
  const alta = profonditaPx + aspetto.altezza

  const ancora = { x: 0.5, y: profonditaPx / alta }
  if (scena.textures.exists(chiave)) return { chiave, ancora }

  const tela = document.createElement('canvas')
  tela.width = larghezza
  tela.height = alta

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  // Un po' di margine sui lati: un mobile che riempie la cella fino al bordo
  // sembra incastrato nel muro invece che appoggiato.
  const bordo = 4
  const x0 = bordo
  const larghezzaUtile = larghezza - bordo * 2

  ctx.fillStyle = css(aspetto.fronte)
  ctx.fillRect(x0, profonditaPx - bordo, larghezzaUtile, aspetto.altezza)

  ctx.fillStyle = css(aspetto.sopra)
  ctx.fillRect(x0, bordo, larghezzaUtile, profonditaPx - bordo * 2)

  ctx.strokeStyle = css(scurisci(aspetto.fronte, 0.7))
  ctx.lineWidth = 1
  ctx.strokeRect(x0 + 0.5, bordo + 0.5, larghezzaUtile - 1, profonditaPx - bordo * 2 - 1)

  dettagli(ctx, aspetto.dettaglio, x0, bordo, larghezzaUtile, profonditaPx - bordo * 2)

  scena.textures.addCanvas(chiave, tela)
  return { chiave, ancora }
}

/** I segni che distinguono un letto da un tavolo, guardandoli da sopra. */
function dettagli(
  ctx: CanvasRenderingContext2D,
  quale: Dettaglio,
  x: number,
  y: number,
  larghezza: number,
  altezza: number,
) {
  switch (quale) {
    case 'letto': {
      // Il cuscino in testa e il risvolto del lenzuolo.
      ctx.fillStyle = css(0xf0f2f6)
      ctx.fillRect(x + 4, y + 4, larghezza - 8, altezza * 0.22)
      ctx.fillStyle = css(0x7c8ba6)
      ctx.fillRect(x + 3, y + altezza * 0.42, larghezza - 6, altezza * 0.5)
      return
    }

    case 'cucina': {
      // Due fuochi e il bordo del lavello.
      ctx.fillStyle = css(0x3b3f45)
      for (const dx of [0.3, 0.7]) {
        ctx.beginPath()
        ctx.arc(x + larghezza * dx, y + altezza * 0.35, Math.min(7, altezza * 0.16), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = css(0x6f757d)
      ctx.strokeRect(x + 5.5, y + altezza * 0.6, larghezza - 11, altezza * 0.3)
      return
    }

    case 'armadio': {
      // Le due ante e le maniglie.
      ctx.strokeStyle = css(0x53402c)
      ctx.beginPath()
      ctx.moveTo(x + larghezza / 2, y + 3)
      ctx.lineTo(x + larghezza / 2, y + altezza - 3)
      ctx.stroke()

      ctx.fillStyle = css(0xd8c08a)
      for (const dx of [-5, 4]) {
        ctx.fillRect(x + larghezza / 2 + dx, y + altezza / 2 - 1, 2, 5)
      }
      return
    }

    case 'tavolo': {
      // Il piano più chiaro al centro: dice che è una superficie, non un blocco.
      ctx.fillStyle = 'rgba(255,255,255,0.10)'
      ctx.fillRect(x + 5, y + 5, larghezza - 10, altezza - 10)
      return
    }

    case 'divano': {
      // Schienale in alto e due cuscini.
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(x + 2, y + 2, larghezza - 4, altezza * 0.28)
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'
      ctx.beginPath()
      ctx.moveTo(x + larghezza / 2, y + altezza * 0.35)
      ctx.lineTo(x + larghezza / 2, y + altezza - 4)
      ctx.stroke()
      return
    }
  }
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

function scurisci(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}
