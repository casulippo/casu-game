import Phaser from 'phaser'
import { TILE_W } from '../../engine/iso'

/** Elementi condivisi tra la scena esterna e gli interni. */

/**
 * Da che parte viene il sole.
 *
 * Un'unica direzione condivisa da alberi, personaggi e in futuro edifici: è
 * quello che fa sembrare una scena illuminata da una fonte sola invece che
 * ogni oggetto con la sua ombra per conto suo. Viene da alto-sinistra, le
 * ombre cadono in basso-destra — coerente in tutta la mappa esterna.
 */
export const DIREZIONE_OMBRA = { x: 0.42, y: 0.34 }

/** L'angolo della direzione dell'ombra, per allungare le ellissi lungo l'asse giusto. */
const ANGOLO_OMBRA = Math.atan2(DIREZIONE_OMBRA.y, DIREZIONE_OMBRA.x)

/**
 * Un'ombra a terra, spostata e allungata secondo `DIREZIONE_OMBRA`.
 *
 * `scarto` è quanto l'ombra si allontana dalla base dell'oggetto, in pixel:
 * un oggetto più alto proietta un'ombra più lunga.
 */
export function disegnaOmbra(
  scena: Phaser.Scene,
  larghezza: number,
  scarto: number,
): Phaser.GameObjects.Ellipse {
  const ombra = scena.add.ellipse(
    DIREZIONE_OMBRA.x * scarto,
    DIREZIONE_OMBRA.y * scarto,
    larghezza,
    larghezza * 0.42,
    0x000000,
    0.3,
  )
  ombra.setRotation(ANGOLO_OMBRA)
  return ombra
}

/**
 * Il personaggio: ombra, corpo, testa.
 *
 * È il ripiego per quando lo sprite disegnato non si carica: brutto ma
 * leggibile, e soprattutto visibile — un giocatore invisibile è peggio di un
 * giocatore fatto di tre forme geometriche.
 */
export function creaGiocatore(scena: Phaser.Scene): Phaser.GameObjects.Container {
  const ombra = disegnaOmbra(scena, TILE_W * 0.4, 6)
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
