import Phaser from 'phaser'
import { TILE_H, TILE_W, grigliaASchermo } from '../engine/iso'
import type { Attraversamento, Mezzeria } from '../engine/city'
import type { Pavimentazione } from '../engine/quartieri'

/**
 * Le superfici del suolo: fotografie vere, non più texture disegnate da codice.
 *
 * Ogni materiale è un'unica immagine seamless (1024x1024, si ripete senza
 * cuciture) in `public/terreno/`. Il gioco non la ridimensiona in tante
 * varianti: la campiona a finestre di una cella, alla posizione che quella
 * cella occupa nel mondo — così il disegno continua identico attraverso i
 * confini dei blocchi in cui il suolo viene dipinto, senza bisogno di
 * generare nulla in anticipo.
 *
 * Le fotografie non portano ombre proprie: quelle sono affare di chi ci sta
 * sopra (alberi, personaggi, edifici), tutti allineati sullo stesso sole in
 * `comuni.ts`. Un tile con l'ombra già dentro la proietterebbe due volte, o
 * nella direzione sbagliata a seconda di dove cade sulla mappa.
 */

const MATERIALI = {
  asfalto: 'asfalto',
  ciottolato: 'ciottolato',
  sterrato: 'sterrato',
  lastricato: 'lastricato',
  erba: 'erba',
} as const

export type Materiale = keyof typeof MATERIALI

/** Lato della fotografia sorgente, in pixel: tutte e cinque sono quadrate uguali. */
const LATO_SORGENTE = 1024

function chiaveSorgente(materiale: Materiale): string {
  return `terreno-src-${materiale}`
}

export function caricaTerreno(scena: Phaser.Scene) {
  for (const nome of Object.keys(MATERIALI) as Materiale[]) {
    scena.load.image(chiaveSorgente(nome), `terreno/${nome}.jpg`)
  }
}

/**
 * Disegna una cella di terreno campionando la fotografia alla sua posizione
 * nel mondo, non a una posizione relativa al pezzo di canvas che la ospita.
 *
 * È questo a far continuare il disegno da un blocco all'altro: due celle
 * adiacenti che cadono in blocchi diversi campionano comunque punti adiacenti
 * della stessa foto.
 *
 * Quando la finestra scavalca il bordo della foto (che si ripete), va
 * spezzata in più rettangoli — fino a quattro, se cade proprio sull'angolo.
 * È l'equivalente su canvas 2D del `GL_REPEAT` di una scheda grafica.
 */
function disegnaTerrenoRipetuto(
  ctx: CanvasRenderingContext2D,
  sorgente: CanvasImageSource,
  mondoX: number,
  mondoY: number,
  destX: number,
  destY: number,
) {
  const sx = ((mondoX % LATO_SORGENTE) + LATO_SORGENTE) % LATO_SORGENTE
  const sy = ((mondoY % LATO_SORGENTE) + LATO_SORGENTE) % LATO_SORGENTE

  const largoA = Math.min(TILE_W, LATO_SORGENTE - sx)
  const altoA = Math.min(TILE_H, LATO_SORGENTE - sy)

  ctx.drawImage(sorgente, sx, sy, largoA, altoA, destX, destY, largoA, altoA)

  if (largoA < TILE_W) {
    ctx.drawImage(
      sorgente,
      0,
      sy,
      TILE_W - largoA,
      altoA,
      destX + largoA,
      destY,
      TILE_W - largoA,
      altoA,
    )
  }
  if (altoA < TILE_H) {
    ctx.drawImage(
      sorgente,
      sx,
      0,
      largoA,
      TILE_H - altoA,
      destX,
      destY + altoA,
      largoA,
      TILE_H - altoA,
    )
  }
  if (largoA < TILE_W && altoA < TILE_H) {
    ctx.drawImage(
      sorgente,
      0,
      0,
      TILE_W - largoA,
      TILE_H - altoA,
      destX + largoA,
      destY + altoA,
      TILE_W - largoA,
      TILE_H - altoA,
    )
  }
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
  /** Usato solo dove non c'è una fotografia (l'acqua). */
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

      // Superfici senza fotografia, come il mare: un quadrato di colore pieno.
      if (!info.materiale) {
        ctx.fillStyle = css(info.colore)
        ctx.fillRect(sinistra, alto, TILE_W, TILE_H)
        continue
      }

      if (info.coloreCordolo !== null && info.rialzo > 0) {
        disegnaFacce(ctx, sinistra, alto, info.rialzo, info.coloreCordolo)
      }

      const cima = alto - info.rialzo

      const sorgente = scena.textures
        .get(chiaveSorgente(info.materiale))
        .getSourceImage() as CanvasImageSource

      disegnaTerrenoRipetuto(ctx, sorgente, x * TILE_W, y * TILE_H, sinistra, cima)

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
