import Phaser from 'phaser'
import type { Griglia } from '../engine/iso'
import { preparaFoglio } from './ritaglio'

/**
 * I personaggi: sprite animati a quattro direzioni.
 *
 * Ogni foglio ha quattro fotogrammi di camminata per riga e una riga per
 * direzione, nell'ordine di `DIREZIONI`. I fogli vengono da immagini generate e
 * poi ricomposti in griglia: le pose di profilo sono disegnate rivolte a
 * sinistra e specchiate per la destra, quindi le due righe laterali sono
 * l'una l'immagine allo specchio dell'altra.
 */

const COLONNE = 4
const RIGHE = 4

/** Larghezza a schermo di un fotogramma, in pixel. */
const LARGHEZZA = 56

/** I personaggi disponibili, e il file da cui vengono. */
export const PERSONAGGI = [
  'kai',
  'armiere',
  'venditore',
  'mafia',
  'capo',
] as const

export type NomePersonaggio = (typeof PERSONAGGI)[number]

/**
 * L'ordine delle righe nel foglio: sono le quattro direzioni cardinali, che
 * è quello che serve a una vista dall'alto.
 */
const DIREZIONI = ['fronte', 'schiena', 'sinistra', 'destra'] as const
export type Direzione = (typeof DIREZIONI)[number]

export function caricaPersonaggi(scena: Phaser.Scene) {
  for (const nome of PERSONAGGI) {
    scena.load.image(sorgente(nome), `personaggi/${nome}.png`)
  }
}

function sorgente(nome: NomePersonaggio): string {
  return `pg-src-${nome}`
}

export interface Personaggio {
  sprite: Phaser.GameObjects.Sprite
  /** Aggiorna posa e animazione secondo la direzione di marcia. */
  aggiorna: (direzione: Griglia, inMovimento: boolean) => void
}

export function creaPersonaggio(
  scena: Phaser.Scene,
  nome: NomePersonaggio,
  x: number,
  y: number,
): Personaggio | null {
  const foglio = preparaFoglio(
    scena,
    sorgente(nome),
    nome,
    COLONNE,
    RIGHE,
    LARGHEZZA,
  )
  if (!foglio) return null

  DIREZIONI.forEach((direzione, riga) => {
    const chiave = `${nome}-cammina-${direzione}`
    if (scena.anims.exists(chiave)) return

    scena.anims.create({
      key: chiave,
      frames: scena.anims.generateFrameNumbers(nome, {
        start: riga * COLONNE,
        end: riga * COLONNE + COLONNE - 1,
      }),
      frameRate: 8,
      repeat: -1,
    })
  })

  const sprite = scena.add.sprite(x, y, nome, 0)
  // Ancorato ai piedi: è lì che il personaggio tocca il suolo, ed è quel punto
  // che deve coincidere con la cella su cui si trova.
  sprite.setOrigin(0.5, 1)

  let direzioneCorrente: Direzione = 'fronte'

  return {
    sprite,
    aggiorna(direzione, inMovimento) {
      if (inMovimento) {
        direzioneCorrente = direzioneDa(direzione)
        const chiave = `${nome}-cammina-${direzioneCorrente}`
        if (sprite.anims.currentAnim?.key !== chiave) sprite.play(chiave, true)
      } else if (sprite.anims.isPlaying) {
        sprite.anims.stop()
        // Fermo, torna al primo fotogramma della direzione in cui guardava.
        sprite.setFrame(DIREZIONI.indexOf(direzioneCorrente) * COLONNE)
      }
    },
  }
}

/** Il fotogramma da fermo di una direzione: serve a chi non cammina mai. */
export function fotogrammaFermo(direzione: Direzione): number {
  return DIREZIONI.indexOf(direzione) * COLONNE
}

/**
 * Dalla direzione di marcia alla riga del foglio.
 *
 * Muovendosi in diagonale comanda l'asse più marcato: si sceglie la posa che
 * guarda più o meno da quella parte, invece di inventare una quinta direzione
 * che nel foglio non c'è.
 */
function direzioneDa(dir: Griglia): Direzione {
  if (Math.abs(dir.x) > Math.abs(dir.y)) {
    return dir.x > 0 ? 'destra' : 'sinistra'
  }
  return dir.y > 0 ? 'fronte' : 'schiena'
}
