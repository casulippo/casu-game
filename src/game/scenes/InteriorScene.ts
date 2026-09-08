import Phaser from 'phaser'
import {
  ALTEZZA_PIANO,
  direzioneDaVettoreSchermo,
  direzioneSchermoAGriglia,
  grigliaASchermo,
  profondita,
  verticiCella,
  type Griglia,
} from '../../engine/iso'
import {
  calpestabileInterno,
  generaInterno,
  ingresso,
  sullUscita,
  type CellaInterno,
} from '../../engine/interni'
import { oreDaTempoReale } from '../../engine/time'
import { gameStore } from '../../store'
import { leggiSpinta } from '../input'
import { creaGiocatore, puntiDaVertici } from './comuni'

const VELOCITA = 3.2

const COLORE_PAVIMENTO: Record<CellaInterno, number> = {
  pavimento: 0x7a5c3e,
  muro: 0x4a3a2a,
  letto: 0x6e5238,
  tavolo: 0x6e5238,
  uscita: 0xc9a15b,
}

/**
 * L'interno di un luogo.
 *
 * Stessa proiezione isometrica dell'esterno, stessa logica di movimento: cambia
 * solo la mappa e il fatto che qui l'azione riporta fuori invece che dentro.
 */
export class InteriorScene extends Phaser.Scene {
  private mappa: CellaInterno[][] = []
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.Container
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private tastoAzione!: Phaser.Input.Keyboard.Key

  constructor() {
    super('interno')
  }

  create() {
    this.mappa = generaInterno()
    this.pos = ingresso(this.mappa)

    this.disegnaPavimento()
    this.disegnaMuri()
    this.disegnaMobili()
    this.giocatore = creaGiocatore(this)

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
    this.tastoAzione = this.input.keyboard!.addKey('E')

    this.cameras.main.setBackgroundColor(0x14100c)
    this.centraCamera()
    this.aggiornaGiocatore()
  }

  update(_time: number, deltaMs: number) {
    this.muovi(deltaMs / 1000)
    this.aggiornaGiocatore()
    this.aggiornaUscitaVicina()
    this.controllaUscita()

    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
  }

  // -------------------------------------------------------------- interazione

  private aggiornaUscitaVicina() {
    const stato = gameStore.getState()

    // Se lo store dice che siamo già fuori, la scena sta per cambiare: non
    // annunciare più un'uscita, o la UI si troverebbe in città con in mano
    // un'azione da interno.
    if (stato.ambiente !== 'interno') return

    stato.segnalaInterazione(
      sullUscita(this.mappa, this.pos) ? { tipo: 'esci' } : null,
    )
  }

  private controllaUscita() {
    const stato = gameStore.getState()

    // Il pulsante touch scrive nello store: se siamo tornati fuori, cambia scena.
    if (stato.ambiente === 'citta') {
      this.scene.start('city')
      return
    }

    if (!Phaser.Input.Keyboard.JustDown(this.tastoAzione)) return
    if (sullUscita(this.mappa, this.pos)) stato.esci()
  }

  // ---------------------------------------------------------------- movimento

  private muovi(deltaSec: number) {
    const { dir, intensita } = this.direzioneRichiesta()
    if (intensita === 0) return

    const passo = VELOCITA * deltaSec * intensita

    const nuovaX = this.pos.x + dir.x * passo
    if (calpestabileInterno(this.mappa, nuovaX, this.pos.y)) this.pos.x = nuovaX

    const nuovaY = this.pos.y + dir.y * passo
    if (calpestabileInterno(this.mappa, this.pos.x, nuovaY)) this.pos.y = nuovaY
  }

  private direzioneRichiesta(): { dir: Griglia; intensita: number } {
    const touch = leggiSpinta()
    if (touch.intensita > 0) {
      return {
        dir: direzioneDaVettoreSchermo(touch.x, touch.y),
        intensita: touch.intensita,
      }
    }

    const dir = direzioneSchermoAGriglia(
      this.tasti.up.isDown || this.wasd.W.isDown,
      this.tasti.down.isDown || this.wasd.S.isDown,
      this.tasti.left.isDown || this.wasd.A.isDown,
      this.tasti.right.isDown || this.wasd.D.isDown,
    )

    return { dir, intensita: dir.x === 0 && dir.y === 0 ? 0 : 1 }
  }

  private aggiornaGiocatore() {
    const { sx, sy } = grigliaASchermo(this.pos)
    this.giocatore.setPosition(sx, sy)
    this.giocatore.setDepth(profondita(this.pos) + 0.5)
  }

  // ---------------------------------------------------------------- rendering

  private disegnaPavimento() {
    const g = this.add.graphics()
    g.setDepth(-1000)

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        const cella = this.mappa[y][x]
        if (cella === 'muro') continue

        g.fillStyle(COLORE_PAVIMENTO[cella === 'uscita' ? 'uscita' : 'pavimento'], 1)
        g.lineStyle(1, 0x000000, 0.16)
        const punti = puntiDaVertici(verticiCella({ x, y }))
        g.fillPoints(punti, true)
        g.strokePoints(punti, true)
      }
    }
  }

  private disegnaMuri() {
    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'muro') continue
        this.disegnaBlocco({ x, y }, ALTEZZA_PIANO * 1.6, 0x4a3a2a, 0x5d4a35, 0x6b573f)
      }
    }
  }

  private disegnaMobili() {
    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        const cella = this.mappa[y][x]
        if (cella === 'letto') {
          this.disegnaBlocco({ x, y }, 12, 0x7c3f46, 0x9d5158, 0xd8dde8)
        } else if (cella === 'tavolo') {
          this.disegnaBlocco({ x, y }, 16, 0x5a4632, 0x6f5740, 0x8a6d4f)
        }
      }
    }
  }

  private disegnaBlocco(
    cella: Griglia,
    altezza: number,
    coloreSinistra: number,
    coloreDestra: number,
    coloreTetto: number,
  ) {
    const [tx, ty, rx, ry, bx, by, lx, ly] = verticiCella(cella)

    const g = this.add.graphics()
    g.setDepth(profondita(cella))

    g.fillStyle(coloreSinistra, 1)
    g.fillPoints(
      puntiDaVertici([lx, ly - altezza, lx, ly, bx, by, bx, by - altezza]),
      true,
    )

    g.fillStyle(coloreDestra, 1)
    g.fillPoints(
      puntiDaVertici([bx, by - altezza, bx, by, rx, ry, rx, ry - altezza]),
      true,
    )

    g.fillStyle(coloreTetto, 1)
    g.lineStyle(1, 0x241c14, 0.8)
    const sopra = puntiDaVertici([
      tx,
      ty - altezza,
      rx,
      ry - altezza,
      bx,
      by - altezza,
      lx,
      ly - altezza,
    ])
    g.fillPoints(sopra, true)
    g.strokePoints(sopra, true)
  }

  /** La stanza è piccola: sta tutta a schermo, la camera non insegue. */
  private centraCamera() {
    const centro = grigliaASchermo({
      x: this.mappa[0].length / 2,
      y: this.mappa.length / 2,
    })
    this.cameras.main.centerOn(centro.sx, centro.sy - ALTEZZA_PIANO)
  }
}
