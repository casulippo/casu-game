import Phaser from 'phaser'
import type { Griglia } from '../engine/iso'
import { preparaFoglio } from './ritaglio'

/**
 * Il protagonista: sprite animato a quattro direzioni.
 *
 * Il foglio ha una riga per direzione e otto fotogrammi di camminata ciascuna.
 */

const COLONNE = 8
const RIGHE = 4
/** Larghezza a schermo di un fotogramma, in pixel. */
const LARGHEZZA = 44

/**
 * L'ordine delle righe nel foglio.
 *
 * In isometrica le direzioni sono diagonali rispetto alla griglia: "giù a
 * destra" significa x crescente, non semplicemente "sud".
 */
const DIREZIONI = ['giu-destra', 'giu-sinistra', 'su-sinistra', 'su-destra'] as const
export type Direzione = (typeof DIREZIONI)[number]

export function caricaPersonaggio(scena: Phaser.Scene) {
  scena.load.image('pg-src', 'personaggi/protagonista.jpg')
}

export interface Protagonista {
  sprite: Phaser.GameObjects.Sprite
  /** Aggiorna posa e animazione secondo la direzione di marcia. */
  aggiorna: (direzione: Griglia, inMovimento: boolean) => void
}

export function creaProtagonista(
  scena: Phaser.Scene,
  x: number,
  y: number,
): Protagonista | null {
  const foglio = preparaFoglio(scena, 'pg-src', 'pg', COLONNE, RIGHE, LARGHEZZA)
  if (!foglio) return null

  DIREZIONI.forEach((direzione, riga) => {
    const chiave = `cammina-${direzione}`
    if (scena.anims.exists(chiave)) return

    scena.anims.create({
      key: chiave,
      frames: scena.anims.generateFrameNumbers('pg', {
        start: riga * COLONNE,
        end: riga * COLONNE + COLONNE - 1,
      }),
      frameRate: 10,
      repeat: -1,
    })
  })

  const sprite = scena.add.sprite(x, y, 'pg', 0)
  // Ancorato ai piedi: è lì che il personaggio tocca il suolo, ed è quel punto
  // che deve coincidere con la cella su cui si trova.
  sprite.setOrigin(0.5, 1)

  let direzioneCorrente: Direzione = 'giu-destra'

  return {
    sprite,
    aggiorna(direzione, inMovimento) {
      if (inMovimento) {
        direzioneCorrente = direzioneDa(direzione)
        const chiave = `cammina-${direzioneCorrente}`
        if (sprite.anims.currentAnim?.key !== chiave) sprite.play(chiave, true)
      } else if (sprite.anims.isPlaying) {
        sprite.anims.stop()
        // Fermo, torna alla posa neutra della direzione in cui guardava.
        sprite.setFrame(DIREZIONI.indexOf(direzioneCorrente) * COLONNE)
      }
    },
  }
}

/**
 * Dalla direzione di marcia alla riga del foglio.
 *
 * Le pose disponibili sono quattro, disegnate di tre quarti; le direzioni di
 * marcia sono quelle cardinali. Si sceglie la posa che guarda più o meno da
 * quella parte: andando verso il basso si usa quella rivolta in avanti,
 * verso l'alto quella di spalle.
 */
function direzioneDa(dir: Griglia): Direzione {
  if (Math.abs(dir.x) > Math.abs(dir.y)) {
    return dir.x > 0 ? 'giu-destra' : 'giu-sinistra'
  }
  return dir.y > 0 ? 'giu-destra' : 'su-sinistra'
}
