import Phaser from 'phaser'
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

/**
 * Gli alberi: chioma e tronco disegnati a runtime, stesso linguaggio cartoon
 * piatto degli edifici e dell'arredo — non più render fotorealistici.
 *
 * L'ombra a terra segue `DIREZIONE_OMBRA`, la stessa di personaggi e arredo,
 * così tutta la mappa resta illuminata da un sole solo. L'ancora è il centro
 * della base del tronco: dove l'albero "tocca" la cella.
 */
export const ALBERI = ['verde', 'autunno', 'conifera'] as const
export type TipoAlbero = (typeof ALBERI)[number]

interface AspettoAlbero {
  chioma: number
  chiomaChiara: number
  chiomaScura: number
  tronco: number
  appuntita: boolean
}

const ASPETTO_ALBERO: Record<TipoAlbero, AspettoAlbero> = {
  verde: {
    chioma: 0x5fae53,
    chiomaChiara: 0x77c669,
    chiomaScura: 0x4a8f40,
    tronco: 0x6b4a30,
    appuntita: false,
  },
  autunno: {
    chioma: 0xd98a3d,
    chiomaChiara: 0xe8a959,
    chiomaScura: 0xb56b2a,
    tronco: 0x6b4a30,
    appuntita: false,
  },
  conifera: {
    chioma: 0x3f7a52,
    chiomaChiara: 0x54935f,
    chiomaScura: 0x2f5f40,
    tronco: 0x5a4632,
    appuntita: true,
  },
}

const LATO_ALBERO = 64
/** Centro della base del tronco, nel riquadro dell'albero. */
const ANCORA_ALBERO = { x: 0.5, y: 0.86 }

export function chiaveAlbero(scena: Phaser.Scene, tipo: TipoAlbero): string {
  const chiave = `albero-${tipo}`
  if (scena.textures.exists(chiave)) return chiave

  const { canvas, ctx } = tela(LATO_ALBERO, LATO_ALBERO)
  if (!ctx) return chiave

  const aspetto = ASPETTO_ALBERO[tipo]
  const baseX = LATO_ALBERO * ANCORA_ALBERO.x
  const baseY = LATO_ALBERO * ANCORA_ALBERO.y

  // L'ombra a terra, nella stessa direzione del sole del resto della mappa.
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(
    baseX + DIREZIONE_OMBRA.x * 8,
    baseY + DIREZIONE_OMBRA.y * 5,
    16,
    7,
    0,
    0,
    Math.PI * 2,
  )
  ctx.fill()

  // Il tronco: solo un accenno, la chioma lo copre quasi tutto dall'alto.
  ctx.fillStyle = css(aspetto.tronco)
  ctx.fillRect(baseX - 4, baseY - 10, 8, 10)

  // La chioma: un ciuffo di lobi tondi per le latifoglie, un cono per la conifera.
  const centroChioma = { x: baseX, y: baseY - 22 }
  if (aspetto.appuntita) {
    ctx.fillStyle = css(aspetto.chiomaScura)
    ctx.beginPath()
    ctx.moveTo(centroChioma.x, centroChioma.y - 22)
    ctx.lineTo(centroChioma.x + 18, centroChioma.y + 14)
    ctx.lineTo(centroChioma.x - 18, centroChioma.y + 14)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = css(aspetto.chioma)
    ctx.beginPath()
    ctx.moveTo(centroChioma.x, centroChioma.y - 22)
    ctx.lineTo(centroChioma.x + 13, centroChioma.y + 6)
    ctx.lineTo(centroChioma.x - 13, centroChioma.y + 6)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = css(aspetto.chiomaChiara)
    ctx.beginPath()
    ctx.arc(centroChioma.x - 4, centroChioma.y - 12, 3.5, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const lobi = [
      { dx: 0, dy: 0, r: 17 },
      { dx: -12, dy: 6, r: 12 },
      { dx: 12, dy: 6, r: 12 },
      { dx: 0, dy: -10, r: 12 },
    ]
    ctx.fillStyle = css(aspetto.chiomaScura)
    for (const lobo of lobi) {
      ctx.beginPath()
      ctx.arc(centroChioma.x + lobo.dx, centroChioma.y + lobo.dy + 2, lobo.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = css(aspetto.chioma)
    for (const lobo of lobi) {
      ctx.beginPath()
      ctx.arc(centroChioma.x + lobo.dx, centroChioma.y + lobo.dy, lobo.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = css(aspetto.chiomaChiara)
    ctx.beginPath()
    ctx.arc(centroChioma.x - 6, centroChioma.y - 8, 6, 0, Math.PI * 2)
    ctx.fill()
  }

  scena.textures.addCanvas(chiave, canvas)
  return chiave
}

export function ancoraAlbero(): { x: number; y: number } {
  return ANCORA_ALBERO
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
