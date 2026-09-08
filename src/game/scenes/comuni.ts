import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../../engine/iso'

/** Elementi condivisi tra la scena esterna e gli interni. */

/**
 * Il personaggio: ombra, corpo, testa.
 * Segnaposto in attesa degli sprite, ma già leggibile in isometrica.
 */
export function creaGiocatore(scena: Phaser.Scene): Phaser.GameObjects.Container {
  const ombra = scena.add.ellipse(0, 0, TILE_W * 0.4, TILE_H * 0.4, 0x000000, 0.35)
  const corpo = scena.add.rectangle(0, -16, 12, 22, 0xd88c3f)
  corpo.setStrokeStyle(1, 0x2b2b2b)
  const testa = scena.add.circle(0, -32, 6, 0xf0c9a0)
  testa.setStrokeStyle(1, 0x2b2b2b)

  return scena.add.container(0, 0, [ombra, corpo, testa])
}

/** Converte la lista piatta di coordinate in punti per `fillPoints`. */
export function puntiDaVertici(vertici: number[]): Phaser.Math.Vector2[] {
  const punti: Phaser.Math.Vector2[] = []
  for (let i = 0; i < vertici.length; i += 2) {
    punti.push(new Phaser.Math.Vector2(vertici[i], vertici[i + 1]))
  }
  return punti
}
