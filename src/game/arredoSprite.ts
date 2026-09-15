import Phaser from 'phaser'
import { TILE_W } from '../engine/iso'
import type { TipoArredo } from '../engine/arredo'

/**
 * Gli sprite dell'arredo di periferia e i muri di cinta, disegnati a runtime
 * nello stesso linguaggio cartoon piatto del resto della mappa — non più
 * ritagliati da un foglio fotografico.
 */

function tela(larghezza: number, altezza: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(larghezza))
  c.height = Math.max(1, Math.ceil(altezza))
  const ctx = c.getContext('2d')
  if (ctx) ctx.imageSmoothingEnabled = false
  return { canvas: c, ctx }
}

function css(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

function scurisci(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}

/** Quante celle occupa ogni pezzo, per dargli la scala giusta a schermo. */
const SCALA: Partial<Record<TipoArredo, number>> = {
  'bidone-fuoco': 0.55,
  rifiuti: 0.85,
  cartoni: 0.8,
  'auto-rottame': 1.5,
  'palo-storto': 1.1,
  panni: 1.4,
}

/** I pezzi che fanno luce di notte. */
export const LUMINOSI: Partial<Record<TipoArredo, { raggio: number; forza: number }>> = {
  'bidone-fuoco': { raggio: 52, forza: 0.5 },
}

export interface PezzoPronto {
  chiave: string
  frame: number
  scala: number
}

const pronti = new Map<TipoArredo, PezzoPronto>()

/** Genera (una sola volta) tutte le texture dell'arredo di periferia. */
export function preparaArredo(scena: Phaser.Scene) {
  pronti.clear()

  const GENERATORI: Record<
    'bidone-fuoco' | 'rifiuti' | 'cartoni' | 'auto-rottame' | 'palo-storto' | 'panni',
    (ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) => void
  > = {
    'bidone-fuoco': disegnaBidoneFuoco,
    rifiuti: disegnaRifiuti,
    cartoni: disegnaCartoni,
    'auto-rottame': disegnaAutoRottame,
    'palo-storto': disegnaPaloStorto,
    panni: disegnaPanni,
  }

  for (const tipo of Object.keys(GENERATORI) as (keyof typeof GENERATORI)[]) {
    const chiave = `arr-${tipo}`
    const scalaCella = SCALA[tipo] ?? 1
    const larghezza = Math.round(TILE_W * scalaCella)
    const altezza = Math.round(larghezza * ALTEZZA_RELATIVA[tipo])

    if (!scena.textures.exists(chiave)) {
      const { canvas, ctx } = tela(larghezza, altezza)
      if (ctx) {
        GENERATORI[tipo](ctx, larghezza, altezza)
        scena.textures.addCanvas(chiave, canvas)
      }
    }

    pronti.set(tipo, { chiave, frame: 0, scala: 1 })
  }

  prepararMuri(scena)
}

/** Proporzione altezza/larghezza di ogni pezzo, per dargli una tela della forma giusta. */
const ALTEZZA_RELATIVA: Record<
  'bidone-fuoco' | 'rifiuti' | 'cartoni' | 'auto-rottame' | 'palo-storto' | 'panni',
  number
> = {
  'bidone-fuoco': 1.5,
  rifiuti: 0.8,
  cartoni: 0.9,
  'auto-rottame': 0.75,
  'palo-storto': 1.6,
  panni: 0.9,
}

function disegnaBidoneFuoco(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  const corpoAlto = altezza * 0.45
  const corpoX = larghezza * 0.18
  const corpoW = larghezza * 0.64

  // Ombra a terra.
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(larghezza / 2, altezza - 2, corpoW * 0.55, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Il bidone, arrugginito.
  ctx.fillStyle = css(0x8a5a3a)
  ctx.fillRect(corpoX, altezza - corpoAlto, corpoW, corpoAlto)
  ctx.fillStyle = css(0x6e4529)
  for (let y = altezza - corpoAlto + 4; y < altezza - 3; y += 6) {
    ctx.fillRect(corpoX, y, corpoW, 2)
  }
  ctx.strokeStyle = css(0x4a2f1a)
  ctx.lineWidth = 1.5
  ctx.strokeRect(corpoX, altezza - corpoAlto, corpoW, corpoAlto)

  // La fiamma.
  const fx = larghezza / 2
  const fy = altezza - corpoAlto
  ctx.fillStyle = css(0xd94e1f)
  ctx.beginPath()
  ctx.moveTo(fx, fy - corpoAlto * 1.1)
  ctx.quadraticCurveTo(fx + corpoW * 0.4, fy - corpoAlto * 0.4, fx + corpoW * 0.2, fy)
  ctx.quadraticCurveTo(fx, fy - corpoAlto * 0.2, fx - corpoW * 0.2, fy)
  ctx.quadraticCurveTo(fx - corpoW * 0.4, fy - corpoAlto * 0.4, fx, fy - corpoAlto * 1.1)
  ctx.fill()
  ctx.fillStyle = css(0xf5b23e)
  ctx.beginPath()
  ctx.moveTo(fx, fy - corpoAlto * 0.65)
  ctx.quadraticCurveTo(fx + corpoW * 0.18, fy - corpoAlto * 0.25, fx, fy)
  ctx.quadraticCurveTo(fx - corpoW * 0.18, fy - corpoAlto * 0.25, fx, fy - corpoAlto * 0.65)
  ctx.fill()
}

function disegnaRifiuti(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(larghezza / 2, altezza - 2, larghezza * 0.45, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const sacchi = [
    { dx: -0.28, dy: 0.05, r: 0.32 },
    { dx: 0.05, dy: -0.05, r: 0.4 },
    { dx: 0.32, dy: 0.08, r: 0.3 },
  ]
  for (const s of sacchi) {
    const cx = larghezza * (0.5 + s.dx)
    const cy = altezza * (0.72 + s.dy)
    const r = larghezza * s.r
    ctx.fillStyle = css(0x2c2f33)
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 0.75, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.ellipse(cx - r * 0.3, cy - r * 0.25, r * 0.3, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Rifiuti sparsi ai piedi del cumulo.
  const spruzzo = [0xb0a68f, 0x6f8fa8, 0xd9c05a]
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = css(spruzzo[i % spruzzo.length])
    const cx = larghezza * (0.15 + i * 0.22)
    const cy = altezza * 0.92
    ctx.fillRect(cx, cy, 3, 3)
  }
}

function disegnaCartoni(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(larghezza / 2, altezza - 2, larghezza * 0.45, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const scatole = [
    { x: 0.06, y: 0.45, w: 0.42, h: 0.5 },
    { x: 0.5, y: 0.3, w: 0.46, h: 0.65 },
    { x: 0.18, y: 0.1, w: 0.34, h: 0.42 },
  ]
  for (const s of scatole) {
    const x = larghezza * s.x
    const y = altezza * s.y
    const w = larghezza * s.w
    const h = altezza * s.h
    ctx.fillStyle = css(0xb9925c)
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = css(0x8a6a3d)
    ctx.lineWidth = 1.5
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
    ctx.beginPath()
    ctx.moveTo(x + w / 2, y)
    ctx.lineTo(x + w / 2, y + h)
    ctx.stroke()
  }
}

function disegnaAutoRottame(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(larghezza / 2, altezza - 2, larghezza * 0.48, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  const corpoY = altezza * 0.32
  const corpoH = altezza * 0.6

  // Il corpo, visto di fianco come gli edifici: pianta corta e fascia di fiancata.
  ctx.fillStyle = css(0x8a7a6c)
  ctx.beginPath()
  ctx.moveTo(larghezza * 0.05, corpoY + corpoH)
  ctx.lineTo(larghezza * 0.02, corpoY + corpoH * 0.55)
  ctx.lineTo(larghezza * 0.18, corpoY + corpoH * 0.3)
  ctx.lineTo(larghezza * 0.35, corpoY)
  ctx.lineTo(larghezza * 0.72, corpoY)
  ctx.lineTo(larghezza * 0.85, corpoY + corpoH * 0.3)
  ctx.lineTo(larghezza * 0.98, corpoY + corpoH * 0.55)
  ctx.lineTo(larghezza * 0.95, corpoY + corpoH)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = css(0x5c5045)
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Il finestrino, incrinato.
  ctx.fillStyle = css(0x6f8a94)
  ctx.beginPath()
  ctx.moveTo(larghezza * 0.38, corpoY + corpoH * 0.15)
  ctx.lineTo(larghezza * 0.68, corpoY + corpoH * 0.15)
  ctx.lineTo(larghezza * 0.62, corpoY + corpoH * 0.42)
  ctx.lineTo(larghezza * 0.44, corpoY + corpoH * 0.42)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = css(0x3f4a4e)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(larghezza * 0.44, corpoY + corpoH * 0.18)
  ctx.lineTo(larghezza * 0.6, corpoY + corpoH * 0.38)
  ctx.stroke()

  // Ruggine sparsa.
  ctx.fillStyle = 'rgba(120,60,30,0.35)'
  ctx.beginPath()
  ctx.ellipse(larghezza * 0.25, corpoY + corpoH * 0.75, 6, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // Sui blocchi di cemento, senza ruote.
  ctx.fillStyle = css(0xa9a49b)
  ctx.fillRect(larghezza * 0.2, altezza - 6, 8, 6)
  ctx.fillRect(larghezza * 0.72, altezza - 6, 8, 6)
}

function disegnaPaloStorto(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(larghezza * 0.5, altezza - 2, larghezza * 0.3, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  const baseX = larghezza * 0.5
  const cimaX = larghezza * 0.62
  const cimaY = altezza * 0.08

  ctx.strokeStyle = css(0x5c4632)
  ctx.lineWidth = larghezza * 0.09
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(baseX, altezza - 3)
  ctx.lineTo(cimaX, cimaY)
  ctx.stroke()

  // I cavi, mollemente appesi.
  ctx.strokeStyle = css(0x2b2b2b)
  ctx.lineWidth = 1
  for (const dy of [0.15, 0.28]) {
    ctx.beginPath()
    ctx.moveTo(cimaX - 4, cimaY + altezza * dy)
    ctx.quadraticCurveTo(
      cimaX + larghezza * 0.5,
      cimaY + altezza * (dy + 0.18),
      cimaX + larghezza * 0.95,
      cimaY + altezza * (dy + 0.05),
    )
    ctx.stroke()
  }

  // Il lampione in cima, spento di giorno.
  ctx.fillStyle = css(0x3a4048)
  ctx.beginPath()
  ctx.arc(cimaX, cimaY, larghezza * 0.14, 0, Math.PI * 2)
  ctx.fill()
}

function disegnaPanni(ctx: CanvasRenderingContext2D, larghezza: number, altezza: number) {
  const filoY = altezza * 0.22

  ctx.strokeStyle = css(0x5c4632)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(larghezza * 0.06, altezza - 3)
  ctx.lineTo(larghezza * 0.06, filoY)
  ctx.moveTo(larghezza * 0.94, altezza - 3)
  ctx.lineTo(larghezza * 0.94, filoY)
  ctx.stroke()

  ctx.strokeStyle = css(0x3a3a3a)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(larghezza * 0.06, filoY)
  ctx.lineTo(larghezza * 0.94, filoY)
  ctx.stroke()

  const capi = [
    { x: 0.2, colore: 0xb9c4d9, h: 0.34 },
    { x: 0.4, colore: 0xd9b95a, h: 0.4 },
    { x: 0.6, colore: 0x8fae7e, h: 0.3 },
    { x: 0.8, colore: 0xb97a7a, h: 0.36 },
  ]
  for (const capo of capi) {
    const cx = larghezza * capo.x
    const h = altezza * capo.h
    ctx.fillStyle = css(capo.colore)
    ctx.fillRect(cx - larghezza * 0.06, filoY, larghezza * 0.12, h)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(cx - larghezza * 0.06, filoY + h - 3, larghezza * 0.12, 3)
  }
}

// --- I muri di cinta -------------------------------------------------

export interface MuroPronto {
  chiave: string
  frame: number
  scala: number
}

/** Le quattro varianti di muro, nell'ordine usato da `muroPer`. */
const MATERIALI_MURO = ['mattoni', 'lamiera', 'rete', 'graffiti'] as const

let muriPronti = false

function prepararMuri(scena: Phaser.Scene) {
  const larghezza = TILE_W
  const altezza = Math.round(TILE_W * 0.85)

  for (const materiale of MATERIALI_MURO) {
    const chiave = `arr-muro-${materiale}`
    if (scena.textures.exists(chiave)) continue

    const { canvas, ctx } = tela(larghezza, altezza)
    if (!ctx) continue
    disegnaMuro(ctx, materiale, larghezza, altezza)
    scena.textures.addCanvas(chiave, canvas)
  }

  muriPronti = true
}

function disegnaMuro(
  ctx: CanvasRenderingContext2D,
  materiale: (typeof MATERIALI_MURO)[number],
  larghezza: number,
  altezza: number,
) {
  switch (materiale) {
    case 'mattoni': {
      ctx.fillStyle = css(0x9c6b52)
      ctx.fillRect(0, 0, larghezza, altezza)
      ctx.strokeStyle = css(0x6e4a38)
      ctx.lineWidth = 1
      const filaH = altezza / 5
      for (let f = 0; f < 5; f++) {
        const y = f * filaH
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(larghezza, y)
        ctx.stroke()
        const scarto = f % 2 === 0 ? 0 : larghezza / 4
        for (let x = scarto; x < larghezza; x += larghezza / 2) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.lineTo(x, y + filaH)
          ctx.stroke()
        }
      }
      bordo(ctx, larghezza, altezza, 0x4a2f22)
      break
    }
    case 'lamiera': {
      ctx.fillStyle = css(0x8a8f94)
      ctx.fillRect(0, 0, larghezza, altezza)
      const onde = 6
      for (let i = 0; i < onde; i++) {
        const x = (i / onde) * larghezza
        ctx.fillStyle = css(i % 2 === 0 ? 0x767b80 : 0x9aa0a6)
        ctx.fillRect(x, 0, larghezza / onde, altezza)
      }
      ctx.fillStyle = 'rgba(140,70,30,0.3)'
      ctx.fillRect(larghezza * 0.15, altezza * 0.6, larghezza * 0.3, altezza * 0.25)
      bordo(ctx, larghezza, altezza, 0x4a4e52)
      break
    }
    case 'rete': {
      const pali = css(0x5c625c)
      ctx.strokeStyle = pali
      ctx.lineWidth = 2
      ctx.strokeRect(2, 0, 1, altezza)
      ctx.strokeRect(larghezza - 3, 0, 1, altezza)

      ctx.strokeStyle = 'rgba(90,95,90,0.7)'
      ctx.lineWidth = 1
      const passo = larghezza / 5
      for (let x = -altezza; x < larghezza; x += passo) {
        ctx.beginPath()
        ctx.moveTo(x, altezza)
        ctx.lineTo(x + altezza, 0)
        ctx.stroke()
      }
      for (let x = 0; x < larghezza + altezza; x += passo) {
        ctx.beginPath()
        ctx.moveTo(x, altezza)
        ctx.lineTo(x - altezza, 0)
        ctx.stroke()
      }
      break
    }
    case 'graffiti': {
      ctx.fillStyle = css(0x8f9296)
      ctx.fillRect(0, 0, larghezza, altezza)
      ctx.fillStyle = css(0x7a7d81)
      ctx.fillRect(0, altezza * 0.45, larghezza, 1)

      const colori = [0xd94e4e, 0x4e8fd9, 0xd9c04e]
      colori.forEach((colore, i) => {
        ctx.strokeStyle = css(colore)
        ctx.lineWidth = 2
        ctx.beginPath()
        const y = altezza * (0.3 + i * 0.18)
        ctx.moveTo(larghezza * 0.1, y)
        ctx.quadraticCurveTo(larghezza * 0.5, y - 8, larghezza * 0.9, y + 4)
        ctx.stroke()
      })
      bordo(ctx, larghezza, altezza, 0x5c5f63)
      break
    }
  }
}

function bordo(
  ctx: CanvasRenderingContext2D,
  larghezza: number,
  altezza: number,
  colore: number,
) {
  ctx.strokeStyle = css(scurisci(colore, 1))
  ctx.lineWidth = 1.5
  ctx.strokeRect(0.75, 0.75, larghezza - 1.5, altezza - 1.5)
}

/**
 * Il segmento di muro da usare.
 *
 * Ogni materiale è disegnato in un verso solo: l'altro si ottiene
 * specchiando l'immagine in `CityScene`.
 */
export function muroPer(variante: number): MuroPronto | null {
  if (!muriPronti) return null
  const indice =
    ((variante % MATERIALI_MURO.length) + MATERIALI_MURO.length) % MATERIALI_MURO.length
  return { chiave: `arr-muro-${MATERIALI_MURO[indice]}`, frame: 0, scala: 1 }
}

export function pezzoPer(tipo: TipoArredo): PezzoPronto | null {
  return pronti.get(tipo) ?? null
}
