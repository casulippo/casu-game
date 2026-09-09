import Phaser from 'phaser'
import { TILE_H, TILE_W } from '../../engine/iso'

/** Elementi condivisi tra la scena esterna e gli interni. */

/**
 * Il personaggio: ombra, corpo, testa.
 *
 * È il ripiego per quando lo sprite disegnato non si carica: brutto ma
 * leggibile, e soprattutto visibile — un giocatore invisibile è peggio di un
 * giocatore fatto di tre forme geometriche.
 */
export function creaGiocatore(scena: Phaser.Scene): Phaser.GameObjects.Container {
  const ombra = scena.add.ellipse(0, 0, TILE_W * 0.4, TILE_H * 0.4, 0x000000, 0.35)
  const corpo = scena.add.rectangle(0, -16, 12, 22, 0xd88c3f)
  corpo.setStrokeStyle(1, 0x2b2b2b)
  const testa = scena.add.circle(0, -32, 6, 0xf0c9a0)
  testa.setStrokeStyle(1, 0x2b2b2b)

  return scena.add.container(0, 0, [ombra, corpo, testa])
}

/**
 * Gli oggetti che si accendono col buio: lampioni, finestre, insegne.
 *
 * Ognuno registra la propria opacità a luci accese e a luci spente; il resto è
 * interpolazione. Così l'accensione segue l'ora di gioco con continuità, invece
 * di scattare al tramonto.
 */
export class Luminosi {
  private voci: { oggetto: LuminosoOggetto; acceso: number; spento: number }[] = []

  aggiungi(oggetto: LuminosoOggetto, acceso: number, spento = 0) {
    this.voci.push({ oggetto, acceso, spento })
  }

  /** `intensita` va da 0 (pieno giorno) a 1 (notte fonda). */
  applica(intensita: number) {
    for (const { oggetto, acceso, spento } of this.voci) {
      oggetto.setAlpha(spento + (acceso - spento) * intensita)
    }
  }
}

interface LuminosoOggetto {
  setAlpha(valore: number): unknown
}

/** Converte la lista piatta di coordinate in punti per `fillPoints`. */
export function puntiDaVertici(vertici: number[]): Phaser.Math.Vector2[] {
  const punti: Phaser.Math.Vector2[] = []
  for (let i = 0; i < vertici.length; i += 2) {
    punti.push(new Phaser.Math.Vector2(vertici[i], vertici[i + 1]))
  }
  return punti
}
