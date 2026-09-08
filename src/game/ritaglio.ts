import Phaser from 'phaser'

/**
 * Prepara gli sprite generati: toglie il fondo magenta, ritaglia al contenuto,
 * ridimensiona.
 *
 * Il fondo magenta è una convenzione comoda per i generatori di immagini, che
 * non producono trasparenza: nessun soggetto contiene quel colore, quindi è
 * riconoscibile senza ambiguità.
 *
 * Il ritaglio conta quanto la trasparenza: le immagini hanno il soggetto
 * circondato da molto vuoto, e senza ritagliarlo non si saprebbe dove poggia
 * l'edificio.
 */

/** Quanto un pixel deve tendere al magenta per essere considerato sfondo. */
const SOGLIA_MAGENTA = 90

function eSfondo(r: number, g: number, b: number): boolean {
  // Magenta: rosso e blu alti, verde basso.
  return r > 120 && b > 120 && r - g > SOGLIA_MAGENTA && b - g > SOGLIA_MAGENTA
}

export interface SpritePreparato {
  chiave: string
  larghezza: number
  altezza: number
}

/**
 * Da immagine grezza a texture pronta.
 *
 * `larghezzaFinale` è la dimensione a cui comparirà nel gioco: ridimensionare
 * qui, una volta sola e con interpolazione morbida, dà un risultato molto più
 * pulito che lasciarlo fare alla scheda grafica a ogni fotogramma con il
 * filtro a pixel netti.
 */
export function preparaSprite(
  scena: Phaser.Scene,
  chiaveSorgente: string,
  chiaveFinale: string,
  larghezzaFinale: number,
): SpritePreparato | null {
  if (scena.textures.exists(chiaveFinale)) {
    const t = scena.textures.get(chiaveFinale).getSourceImage() as HTMLCanvasElement
    return { chiave: chiaveFinale, larghezza: t.width, altezza: t.height }
  }

  const sorgente = scena.textures
    .get(chiaveSorgente)
    .getSourceImage() as HTMLImageElement

  const piena = document.createElement('canvas')
  piena.width = sorgente.width
  piena.height = sorgente.height
  const ctxPiena = piena.getContext('2d', { willReadFrequently: true })
  if (!ctxPiena) return null

  ctxPiena.drawImage(sorgente, 0, 0)

  const dati = ctxPiena.getImageData(0, 0, piena.width, piena.height)
  const px = dati.data

  let minX = piena.width
  let minY = piena.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < piena.height; y++) {
    for (let x = 0; x < piena.width; x++) {
      const i = (y * piena.width + x) * 4
      if (eSfondo(px[i], px[i + 1], px[i + 2])) {
        px[i + 3] = 0
        continue
      }
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) return null // tutta sfondo

  ctxPiena.putImageData(dati, 0, 0)

  const larghezzaRitaglio = maxX - minX + 1
  const altezzaRitaglio = maxY - minY + 1
  const scala = larghezzaFinale / larghezzaRitaglio
  const altezzaFinale = Math.max(1, Math.round(altezzaRitaglio * scala))

  const finale = document.createElement('canvas')
  finale.width = Math.max(1, Math.round(larghezzaFinale))
  finale.height = altezzaFinale

  const ctxFinale = finale.getContext('2d')
  if (!ctxFinale) return null

  // Interpolazione morbida in riduzione: a pixel netti si perderebbero
  // dettagli a caso e i contorni verrebbero frastagliati.
  ctxFinale.imageSmoothingEnabled = true
  ctxFinale.imageSmoothingQuality = 'high'
  ctxFinale.drawImage(
    piena,
    minX,
    minY,
    larghezzaRitaglio,
    altezzaRitaglio,
    0,
    0,
    finale.width,
    finale.height,
  )

  scena.textures.addCanvas(chiaveFinale, finale)
  return { chiave: chiaveFinale, larghezza: finale.width, altezza: finale.height }
}

/**
 * Come sopra, ma per un foglio di animazione: ogni riquadro va ripulito e
 * scalato mantenendo la griglia, quindi non si può ritagliare al contenuto.
 */
export function preparaFoglio(
  scena: Phaser.Scene,
  chiaveSorgente: string,
  chiaveFinale: string,
  colonne: number,
  righe: number,
  larghezzaRiquadroFinale: number,
): { chiave: string; larghezzaRiquadro: number; altezzaRiquadro: number } | null {
  const sorgente = scena.textures
    .get(chiaveSorgente)
    .getSourceImage() as HTMLImageElement

  const larghezzaOriginale = sorgente.width / colonne
  const altezzaOriginale = sorgente.height / righe
  const scala = larghezzaRiquadroFinale / larghezzaOriginale
  const altezzaRiquadro = Math.round(altezzaOriginale * scala)
  const larghezzaRiquadro = Math.round(larghezzaRiquadroFinale)

  if (scena.textures.exists(chiaveFinale)) {
    return { chiave: chiaveFinale, larghezzaRiquadro, altezzaRiquadro }
  }

  const piena = document.createElement('canvas')
  piena.width = sorgente.width
  piena.height = sorgente.height
  const ctxPiena = piena.getContext('2d', { willReadFrequently: true })
  if (!ctxPiena) return null

  ctxPiena.drawImage(sorgente, 0, 0)
  const dati = ctxPiena.getImageData(0, 0, piena.width, piena.height)
  const px = dati.data
  for (let i = 0; i < px.length; i += 4) {
    if (eSfondo(px[i], px[i + 1], px[i + 2])) px[i + 3] = 0
  }
  ctxPiena.putImageData(dati, 0, 0)

  const finale = document.createElement('canvas')
  finale.width = larghezzaRiquadro * colonne
  finale.height = altezzaRiquadro * righe
  const ctxFinale = finale.getContext('2d')
  if (!ctxFinale) return null

  ctxFinale.imageSmoothingEnabled = true
  ctxFinale.imageSmoothingQuality = 'high'

  for (let r = 0; r < righe; r++) {
    for (let c = 0; c < colonne; c++) {
      ctxFinale.drawImage(
        piena,
        c * larghezzaOriginale,
        r * altezzaOriginale,
        larghezzaOriginale,
        altezzaOriginale,
        c * larghezzaRiquadro,
        r * altezzaRiquadro,
        larghezzaRiquadro,
        altezzaRiquadro,
      )
    }
  }

  scena.textures.addSpriteSheet(chiaveFinale, finale as unknown as HTMLImageElement, {
    frameWidth: larghezzaRiquadro,
    frameHeight: altezzaRiquadro,
  })

  return { chiave: chiaveFinale, larghezzaRiquadro, altezzaRiquadro }
}
