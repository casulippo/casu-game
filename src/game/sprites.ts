import Phaser from 'phaser'

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
 * Gli alberi: render fotorealistici dall'alto, non più disegnati da codice.
 *
 * Ogni albero porta già la propria ombra incisa nel PNG — estratta in
 * `strumenti/albero.py` mantenendo la stessa direzione di `DIREZIONE_OMBRA`,
 * così che alberi e personaggi condividano lo stesso sole pur venendo da
 * pipeline diverse. L'ancora non è il centro dell'immagine: è il centro della
 * sola chioma, calcolato da quello script, perché il riquadro include anche
 * l'ombra che si allunga verso basso-destra.
 */
export const ALBERI = ['verde', 'autunno', 'conifera'] as const
export type TipoAlbero = (typeof ALBERI)[number]

/** Calcolata da `strumenti/albero.py`: centro della chioma, non del riquadro. */
const ANCORA_ALBERO: Record<TipoAlbero, { x: number; y: number }> = {
  verde: { x: 0.406, y: 0.417 },
  autunno: { x: 0.409, y: 0.418 },
  conifera: { x: 0.386, y: 0.429 },
}

export function caricaAlberi(scena: Phaser.Scene) {
  for (const tipo of ALBERI) scena.load.image(chiaveAlbero(tipo), `alberi/${tipo}.png`)
}

export function chiaveAlbero(tipo: TipoAlbero): string {
  return `albero-${tipo}`
}

export function ancoraAlbero(tipo: TipoAlbero): { x: number; y: number } {
  return ANCORA_ALBERO[tipo]
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
