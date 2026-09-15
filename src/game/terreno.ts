import Phaser from 'phaser'
import { TILE_H, TILE_W, grigliaASchermo } from '../engine/iso'
import type { Attraversamento, Mezzeria } from '../engine/city'
import type { Pavimentazione } from '../engine/quartieri'

/**
 * Le superfici del suolo: colori piatti disegnati a runtime, nello stesso
 * linguaggio cartoon degli edifici e dei personaggi — non più fotografie.
 *
 * Ogni cella si dipinge da sé, con un pattern deterministico dato dalle sue
 * coordinate nel mondo: così il disegno continua identico attraverso i
 * confini dei blocchi in cui il suolo viene dipinto, senza dover campionare
 * nulla da un'immagine sorgente.
 *
 * Le superfici non portano ombre proprie: quelle sono affare di chi ci sta
 * sopra (alberi, personaggi, edifici), tutti allineati sullo stesso sole in
 * `comuni.ts`.
 */

const MATERIALI = {
  asfalto: 'asfalto',
  ciottolato: 'ciottolato',
  sterrato: 'sterrato',
  lastricato: 'lastricato',
  erba: 'erba',
} as const

export type Materiale = keyof typeof MATERIALI

interface Tinta {
  base: number
  chiaro: number
  scuro: number
}

const TINTE: Record<Materiale, Tinta> = {
  erba: { base: 0x7bc36b, chiaro: 0x8fd47e, scuro: 0x63a856 },
  asfalto: { base: 0x53575f, chiaro: 0x63676f, scuro: 0x3f434a },
  sterrato: { base: 0xad8552, chiaro: 0xc09a63, scuro: 0x8e6a3f },
  ciottolato: { base: 0xb7ab8d, chiaro: 0xc7bda3, scuro: 0x968a6d },
  lastricato: { base: 0xcbc6b6, chiaro: 0xd9d5c8, scuro: 0xaaa495 },
}

/** Rumore deterministico in [0, 1), stabile per ogni cella del mondo. */
function rumoreCella(x: number, y: number, sale: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + sale * 37.719) * 43758.5453
  return v - Math.floor(v)
}

/**
 * Dipinge una cella di terreno con un pattern cartoon piatto, in coordinate
 * di cella nel mondo (non di blocco): è da lì che il pattern prende il seme,
 * così due celle adiacenti in blocchi diversi restano coerenti.
 */
function disegnaMateriale(
  ctx: CanvasRenderingContext2D,
  materiale: Materiale,
  cellaX: number,
  cellaY: number,
  destX: number,
  destY: number,
) {
  const tinta = TINTE[materiale]
  ctx.fillStyle = css(tinta.base)
  ctx.fillRect(destX, destY, TILE_W, TILE_H)

  switch (materiale) {
    case 'erba':
      disegnaErba(ctx, tinta, cellaX, cellaY, destX, destY)
      break
    case 'asfalto':
      disegnaFlecce(ctx, tinta, cellaX, cellaY, destX, destY, 5, 1.6)
      break
    case 'sterrato':
      disegnaFlecce(ctx, tinta, cellaX, cellaY, destX, destY, 6, 2.4)
      break
    case 'ciottolato':
      disegnaCiottoli(ctx, tinta, cellaX, cellaY, destX, destY)
      break
    case 'lastricato':
      disegnaLastre(ctx, tinta, destX, destY)
      break
  }
}

/** Ciuffi d'erba: due tocchi più scuri e uno più chiaro, mai nella stessa posa. */
function disegnaErba(
  ctx: CanvasRenderingContext2D,
  tinta: Tinta,
  cellaX: number,
  cellaY: number,
  destX: number,
  destY: number,
) {
  for (let i = 0; i < 3; i++) {
    const rx = rumoreCella(cellaX, cellaY, i * 2 + 1)
    const ry = rumoreCella(cellaX, cellaY, i * 2 + 2)
    const cx = destX + 6 + rx * (TILE_W - 12)
    const cy = destY + 6 + ry * (TILE_H - 12)

    ctx.strokeStyle = css(i === 0 ? tinta.chiaro : tinta.scuro)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 3, cy + 4)
    ctx.lineTo(cx, cy - 5)
    ctx.moveTo(cx + 3, cy + 4)
    ctx.lineTo(cx, cy - 5)
    ctx.stroke()
  }
}

/** Puntini sparsi, per superfici granulose come asfalto e sterrato. */
function disegnaFlecce(
  ctx: CanvasRenderingContext2D,
  tinta: Tinta,
  cellaX: number,
  cellaY: number,
  destX: number,
  destY: number,
  quante: number,
  raggio: number,
) {
  for (let i = 0; i < quante; i++) {
    const rx = rumoreCella(cellaX, cellaY, i * 3 + 1)
    const ry = rumoreCella(cellaX, cellaY, i * 3 + 2)
    const rc = rumoreCella(cellaX, cellaY, i * 3 + 3)

    ctx.fillStyle = css(rc > 0.5 ? tinta.chiaro : tinta.scuro)
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(destX + rx * TILE_W, destY + ry * TILE_H, raggio, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

/** Sassetti tondi disposti su una griglia leggera, col bordo scuro tipico del cartoon. */
function disegnaCiottoli(
  ctx: CanvasRenderingContext2D,
  tinta: Tinta,
  cellaX: number,
  cellaY: number,
  destX: number,
  destY: number,
) {
  const passo = TILE_W / 3
  for (let ry = 0; ry < 3; ry++) {
    for (let rx = 0; rx < 3; rx++) {
      const jx = (rumoreCella(cellaX, cellaY, rx * 3 + ry + 1) - 0.5) * 6
      const jy = (rumoreCella(cellaX, cellaY, rx * 3 + ry + 11) - 0.5) * 6
      const chiaro = rumoreCella(cellaX, cellaY, rx * 3 + ry + 21) > 0.5

      const cx = destX + passo * (rx + 0.5) + jx
      const cy = destY + passo * (ry + 0.5) + jy

      ctx.fillStyle = css(chiaro ? tinta.chiaro : tinta.base)
      ctx.strokeStyle = css(tinta.scuro)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, passo * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
}

/** Lastre di pavimentazione: giunti netti sui due lati, come tessere posate. */
function disegnaLastre(
  ctx: CanvasRenderingContext2D,
  tinta: Tinta,
  destX: number,
  destY: number,
) {
  ctx.strokeStyle = css(tinta.scuro)
  ctx.lineWidth = 2
  ctx.strokeRect(destX + 1, destY + 1, TILE_W - 2, TILE_H - 2)

  ctx.strokeStyle = css(tinta.chiaro)
  ctx.lineWidth = 1
  ctx.strokeRect(destX + 3, destY + 3, TILE_W - 6, TILE_H - 6)
}

export interface SuoloDipinto {
  chiave: string
  /** Dove va posizionata l'immagine, in coordinate schermo. */
  x: number
  y: number
}

export interface DescrizioneCella {
  materiale: Materiale | null
  rialzo: number
  coloreCordolo: number | null
  /** Usato solo dove non c'è un materiale (l'acqua). */
  colore: number
  mezzeria?: Mezzeria
  strisce?: Attraversamento | null
}

/**
 * Quante celle di lato ha un blocco di suolo.
 *
 * Il suolo non può essere una texture sola: a 96 celle sarebbe larga 4608
 * pixel, oltre il limite di 4096 che molte schede — quasi tutte quelle mobili —
 * impongono. Spezzarlo in blocchi da 32 celle tiene ogni pezzo entro 1536
 * pixel, al sicuro ovunque.
 */
const CELLE_PER_BLOCCO = 32

/** Spazio in cima a ogni blocco, per i cordoli che sporgono verso l'alto. */
const SPORGENZA = 8

/**
 * Dipinge il suolo su pochi blocchi di immagine.
 *
 * Una cella per oggetto significava migliaia di sprite: pesante, e con i bordi
 * che vibravano di un pixel a seconda della posizione della camera, facendo
 * "ondeggiare" il terreno. Dipingendo a blocchi restano poche immagini e le
 * giunzioni sono fisse per sempre.
 */
export function costruisciSuolo(
  scena: Phaser.Scene,
  lato: number,
  descriviCella: (x: number, y: number) => DescrizioneCella,
): SuoloDipinto[] {
  const pezzi: SuoloDipinto[] = []
  const blocchi = Math.ceil(lato / CELLE_PER_BLOCCO)

  for (let by = 0; by < blocchi; by++) {
    for (let bx = 0; bx < blocchi; bx++) {
      const pezzo = dipingiBlocco(scena, lato, descriviCella, bx, by)
      if (pezzo) pezzi.push(pezzo)
    }
  }

  return pezzi
}

function dipingiBlocco(
  scena: Phaser.Scene,
  lato: number,
  descriviCella: (x: number, y: number) => DescrizioneCella,
  bx: number,
  by: number,
): SuoloDipinto | null {
  const x0 = bx * CELLE_PER_BLOCCO
  const y0 = by * CELLE_PER_BLOCCO
  const x1 = Math.min(lato, x0 + CELLE_PER_BLOCCO)
  const y1 = Math.min(lato, y0 + CELLE_PER_BLOCCO)

  const chiave = `suolo-${bx}-${by}`
  if (scena.textures.exists(chiave)) scena.textures.remove(chiave)

  const tela = document.createElement('canvas')
  tela.width = (x1 - x0) * TILE_W
  tela.height = (y1 - y0) * TILE_H + SPORGENZA

  const ctx = tela.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const info = descriviCella(x, y)
      const sinistra = (x - x0) * TILE_W
      const alto = (y - y0) * TILE_H + SPORGENZA

      // Superfici senza materiale, come il mare: un quadrato di colore pieno.
      if (!info.materiale) {
        ctx.fillStyle = css(info.colore)
        ctx.fillRect(sinistra, alto, TILE_W, TILE_H)
        continue
      }

      if (info.coloreCordolo !== null && info.rialzo > 0) {
        disegnaFacce(ctx, sinistra, alto, info.rialzo, info.coloreCordolo)
      }

      const cima = alto - info.rialzo

      disegnaMateriale(ctx, info.materiale, x, y, sinistra, cima)

      if (info.strisce) disegnaStrisce(ctx, sinistra, cima, info.strisce)
      else if (info.mezzeria) disegnaMezzeria(ctx, sinistra, cima, info.mezzeria)
    }
  }

  scena.textures.addCanvas(chiave, tela)

  // La cella (x0, y0) ha il suo centro in `grigliaASchermo`: l'angolo del
  // blocco sta mezza cella più su e più a sinistra, meno la sporgenza.
  const { sx, sy } = grigliaASchermo({ x: x0, y: y0 })
  return { chiave, x: sx - TILE_W / 2, y: sy - TILE_H / 2 - SPORGENZA }
}

/** Il colore della segnaletica di mezzeria. */
const COLORE_STRISCE = 0xd9c05a

/** Il colore degli attraversamenti pedonali. */
const COLORE_ZEBRE = 0xc9c4b4

/**
 * Quanto è profondo un attraversamento rispetto alla cella che lo ospita.
 *
 * A cella piena le zebre diventavano blocchi bianchi che rubavano l'occhio a
 * tutto il resto: la carreggiata spariva sotto la sua stessa segnaletica.
 */
const PROFONDITA_ZEBRE = 0.55

/**
 * La striscia di mezzeria dentro una cella.
 *
 * Un tratto per cella, staccato dai vicini: è il tratteggio a dire dove corre
 * la carreggiata, e le interruzioni agli incroci si leggono da sole.
 */
function disegnaMezzeria(
  ctx: CanvasRenderingContext2D,
  sinistra: number,
  cima: number,
  mezzeria: Mezzeria,
) {
  ctx.fillStyle = css(COLORE_STRISCE)
  const spessore = 3

  // Sui viali la striscia è doppia e continua; sulle strade è una sola, a
  // tratti. Basta questo a dire quale delle due si sta percorrendo.
  const scarti = mezzeria.doppia ? [-2.5, 2.5] : [0]

  if (mezzeria.verticale !== null) {
    const x = sinistra + mezzeria.verticale * TILE_W - spessore / 2
    const alta = mezzeria.doppia ? TILE_H : TILE_H * 0.6
    const y = cima + (TILE_H - alta) / 2
    for (const scarto of scarti) ctx.fillRect(x + scarto, y, spessore, alta)
  }

  if (mezzeria.orizzontale !== null) {
    const y = cima + mezzeria.orizzontale * TILE_H - spessore / 2
    const larga = mezzeria.doppia ? TILE_W : TILE_W * 0.6
    const x = sinistra + (TILE_W - larga) / 2
    for (const scarto of scarti) ctx.fillRect(x, y + scarto, larga, spessore)
  }
}

/**
 * Le zebre di un attraversamento.
 *
 * Corrono parallele al senso di marcia, come nella realtà: sono la cosa che
 * più di ogni altra dice "qui c'è un incrocio" a chi guarda dall'alto.
 */
function disegnaStrisce(
  ctx: CanvasRenderingContext2D,
  sinistra: number,
  cima: number,
  verso: Attraversamento,
) {
  ctx.fillStyle = css(COLORE_ZEBRE)

  const barre = 4
  const passo = TILE_W / barre
  const spessore = passo * 0.45

  // Le barre corrono nel senso di marcia; la loro lunghezza è la profondità
  // dell'attraversamento, che resta una fascia dentro la cella.
  const lunghezza = TILE_H * PROFONDITA_ZEBRE
  const scarto = (TILE_H - lunghezza) / 2

  for (let i = 0; i < barre; i++) {
    if (verso === 'verticale') {
      ctx.fillRect(sinistra + i * passo + spessore, cima + scarto, spessore, lunghezza)
    } else {
      ctx.fillRect(sinistra + scarto, cima + i * passo + spessore, lunghezza, spessore)
    }
  }
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
  sinistra: number,
  alto: number,
  altezza: number,
  tinta: number,
) {
  ctx.fillStyle = css(scala(tinta, 0.62))
  ctx.fillRect(sinistra, alto + TILE_H - altezza, TILE_W, altezza)
}

function scala(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
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
