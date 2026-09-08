import Phaser from 'phaser'
import { gameStore } from '../../store'
import { oreDaTempoReale } from '../../engine/time'

const TILE = 32
const VELOCITA = 140

/**
 * La scena della città.
 *
 * Segnaposto: un giocatore quadrato che cammina in un isolato delimitato da muri.
 * Quando arriveranno gli asset, la griglia disegnata a mano verrà sostituita da
 * una tilemap autorata in Tiled — la logica di movimento resta identica.
 */
export class CityScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>

  constructor() {
    super('city')
  }

  create() {
    const larghezza = 30 * TILE
    const altezza = 20 * TILE

    this.disegnaGriglia(larghezza, altezza)

    // Il giocatore: per ora un rettangolo, domani uno sprite animato.
    this.player = this.add.rectangle(
      larghezza / 2,
      altezza / 2,
      TILE * 0.7,
      TILE * 0.9,
      0xe8c170,
    )
    this.player.setStrokeStyle(2, 0x2b2b2b)
    this.physics.add.existing(this.player)

    const corpo = this.player.body as Phaser.Physics.Arcade.Body
    corpo.setCollideWorldBounds(true)

    this.physics.world.setBounds(0, 0, larghezza, altezza)
    this.cameras.main.setBounds(0, 0, larghezza, altezza)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
    this.cameras.main.setBackgroundColor('#1a1d24')

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
  }

  update(_time: number, deltaMs: number) {
    this.muoviGiocatore()

    // Il tempo di gioco scorre insieme al frame rate reale.
    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
  }

  private muoviGiocatore() {
    const corpo = this.player.body as Phaser.Physics.Arcade.Body
    const sinistra = this.tasti.left.isDown || this.wasd.A.isDown
    const destra = this.tasti.right.isDown || this.wasd.D.isDown
    const su = this.tasti.up.isDown || this.wasd.W.isDown
    const giu = this.tasti.down.isDown || this.wasd.S.isDown

    const vx = (destra ? 1 : 0) - (sinistra ? 1 : 0)
    const vy = (giu ? 1 : 0) - (su ? 1 : 0)

    corpo.setVelocity(vx * VELOCITA, vy * VELOCITA)

    // Senza normalizzare, muoversi in diagonale sarebbe più veloce.
    if (vx !== 0 && vy !== 0) {
      corpo.velocity.normalize().scale(VELOCITA)
    }
  }

  private disegnaGriglia(larghezza: number, altezza: number) {
    const g = this.add.graphics()
    g.fillStyle(0x232830, 1)
    g.fillRect(0, 0, larghezza, altezza)

    g.lineStyle(1, 0x2f3540, 1)
    for (let x = 0; x <= larghezza; x += TILE) {
      g.lineBetween(x, 0, x, altezza)
    }
    for (let y = 0; y <= altezza; y += TILE) {
      g.lineBetween(0, y, larghezza, y)
    }

    g.lineStyle(3, 0x4a5568, 1)
    g.strokeRect(0, 0, larghezza, altezza)
  }
}
