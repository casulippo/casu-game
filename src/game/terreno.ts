import Phaser from 'phaser'
import { TILE_H, TILE_W, grigliaASchermo } from '../engine/iso'
import type { Attraversamento, Mezzeria } from '../engine/city'
import type { Pavimentazione } from '../engine/quartieri'

/**
 * Le superfici del suolo.
 *
 * Il colore lo decide la palette del quartiere, il materiale ci mette solo la
 * grana: i motivi qui sotto sono velature neutre — ombre e luci trasparenti —
 * stampate sopra la tinta piena. È l'unico modo perché il contrasto tra strada,
 * marciapiede e verde resti quello dichiarato in `quartieri.ts`.
 *
 * Prima erano fotografie: portavano il proprio colore e la propria luce, e ogni
 * superficie finiva per somigliare alle altre in un impasto in cui la strada
 * non si distingueva dal marciapiede.
 */

const MATERIALI = {
  asfalto: 'asfalto',
  ciottolato: 'ciottolato',
  sterrato: 'sterrato',
  lastricato: 'lastricato',
  erba: 'erba',
} as const

export type Materiale = keyof typeof MATERIALI

/**
 * Quante varianti generare per materiale: senza, la ripetizione dello stesso
 * riquadro si nota subito come un motivo regolare.
 */
const VARIANTI = 6

export function preparaTile(scena: Phaser.Scene) {
  for (const nome of Object.keys(MATERIALI) as Materiale[]) {
    for (let v = 0; v < VARIANTI; v++) {
      const chiave = nomeTile(nome, v)
      if (scena.textures.exists(chiave)) continue

      const tela = document.createElement('canvas')
      tela.width = TILE_W
      tela.height = TILE_H

      const ctx = tela.getContext('2d')
      if (!ctx) continue

      ctx.imageSmoothingEnabled = false
      motivo(ctx, nome, seminatore(nome.length * 31 + v * 7919))

      scena.textures.addCanvas(chiave, tela)
    }
  }
}

/** Un generatore deterministico: la città non cambia grana a ogni avvio. */
function seminatore(seme: number): () => number {
  let stato = seme || 1
  return () => {
    stato = (stato * 1664525 + 1013904223) % 4294967296
    return stato / 4294967296
  }
}

function ombra(forza: number): string {
  return `rgba(0,0,0,${forza})`
}

function luce(forza: number): string {
  return `rgba(255,255,255,${forza})`
}

/** La grana di un materiale, come velatura trasparente. */
function motivo(ctx: CanvasRenderingContext2D, materiale: Materiale, rnd: () => number) {
  switch (materiale) {
    case 'asfalto':
      return grana(ctx, rnd, 90, 0.09, 30, 0.05)

    case 'sterrato':
      return sterrato(ctx, rnd)

    case 'lastricato':
      return lastre(ctx, rnd, 24, 16)

    case 'ciottolato':
      return ciottoli(ctx, rnd)

    case 'erba':
      return ciuffi(ctx, rnd)
  }
}

/** Puntinatura fine: la base di ogni superficie battuta. */
function grana(
  ctx: CanvasRenderingContext2D,
  rnd: () => number,
  scuri: number,
  forzaScuri: number,
  chiari: number,
  forzaChiari: number,
) {
  ctx.fillStyle = ombra(forzaScuri)
  for (let i = 0; i < scuri; i++) {
    ctx.fillRect(Math.floor(rnd() * TILE_W), Math.floor(rnd() * TILE_H), 1, 1)
  }

  ctx.fillStyle = luce(forzaChiari)
  for (let i = 0; i < chiari; i++) {
    ctx.fillRect(Math.floor(rnd() * TILE_W), Math.floor(rnd() * TILE_H), 1, 1)
  }
}

/** Terra battuta: chiazze larghe e qualche sasso. */
function sterrato(ctx: CanvasRenderingContext2D, rnd: () => number) {
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = rnd() > 0.5 ? ombra(0.07) : luce(0.05)
    ctx.beginPath()
    ctx.ellipse(
      rnd() * TILE_W,
      rnd() * TILE_H,
      3 + rnd() * 7,
      2 + rnd() * 5,
      rnd() * Math.PI,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  grana(ctx, rnd, 60, 0.08, 25, 0.06)
}

/** Lastre squadrate, con la fuga scura tra l'una e l'altra. */
function lastre(
  ctx: CanvasRenderingContext2D,
  rnd: () => number,
  larga: number,
  alta: number,
) {
  for (let y = 0; y < TILE_H; y += alta) {
    for (let x = 0; x < TILE_W; x += larga) {
      ctx.fillStyle = rnd() > 0.5 ? luce(0.04) : ombra(0.04)
      ctx.fillRect(x, y, larga - 1, alta - 1)
    }
  }

  ctx.fillStyle = ombra(0.18)
  for (let y = 0; y < TILE_H; y += alta) ctx.fillRect(0, y, TILE_W, 1)
  for (let x = 0; x < TILE_W; x += larga) ctx.fillRect(x, 0, 1, TILE_H)

  grana(ctx, rnd, 25, 0.05, 10, 0.04)
}

/** Sanpietrini: file sfalsate di sassi tondeggianti. */
function ciottoli(ctx: CanvasRenderingContext2D, rnd: () => number) {
  const passo = 8

  for (let y = 0; y < TILE_H; y += passo) {
    const sfalso = (y / passo) % 2 === 0 ? 0 : passo / 2
    for (let x = -passo; x < TILE_W + passo; x += passo) {
      ctx.fillStyle = rnd() > 0.5 ? luce(0.06) : ombra(0.06)
      ctx.beginPath()
      ctx.ellipse(
        x + sfalso + passo / 2,
        y + passo / 2,
        passo / 2 - 0.8,
        passo / 2 - 1.2,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  }

  grana(ctx, rnd, 40, 0.07, 15, 0.05)
}

/** Prato: ciuffi corti, chiari e scuri, senza colore proprio. */
function ciuffi(ctx: CanvasRenderingContext2D, rnd: () => number) {
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = rnd() > 0.45 ? ombra(0.09) : luce(0.07)
    ctx.fillRect(Math.floor(rnd() * TILE_W), Math.floor(rnd() * TILE_H), 1, 2 + Math.floor(rnd() * 2))
  }

  // Qualche chiazza più fitta, perché il prato non sia uniforme.
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ombra(0.05)
    ctx.beginPath()
    ctx.ellipse(rnd() * TILE_W, rnd() * TILE_H, 4 + rnd() * 6, 3 + rnd() * 5, 0, 0, Math.PI * 2)
    ctx.fill()
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

export interface DescrizioneCella {
  materiale: Materiale | null
  rialzo: number
  coloreCordolo: number | null
  /** Il colore della superficie: è lui a dare il tono, la grana vela soltanto. */
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

      // Superfici senza grana, come il mare: un quadrato di colore pieno.
      if (!info.materiale) {
        ctx.fillStyle = css(info.colore)
        ctx.fillRect(sinistra, alto, TILE_W, TILE_H)
        continue
      }

      if (info.coloreCordolo !== null && info.rialzo > 0) {
        disegnaFacce(ctx, sinistra, alto, info.rialzo, info.coloreCordolo)
      }

      const cima = alto - info.rialzo

      ctx.fillStyle = css(info.colore)
      ctx.fillRect(sinistra, cima, TILE_W, TILE_H)

      const sorgente = scena.textures
        .get(nomeTile(info.materiale, varianteDi(x, y)))
        .getSourceImage() as CanvasImageSource

      ctx.drawImage(sorgente, sinistra, cima)

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

/** La variante da usare per una cella: stabile, così la mappa non sfarfalla. */
function varianteDi(x: number, y: number): number {
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
