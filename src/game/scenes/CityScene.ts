import Phaser from 'phaser'
import {
  ALTEZZA_PIANO,
  TILE_H,
  TILE_W,
  direzioneDaVettoreSchermo,
  direzioneSchermoAGriglia,
  grigliaASchermo,
  profondita,
  verticiCella,
  type Griglia,
} from '../../engine/iso'
import { leggiSpinta } from '../input'
import {
  calpestabile,
  generaCitta,
  pianiEdificio,
  puntoDiPartenza,
  type Cella,
} from '../../engine/city'
import { faseGiorno, oreDaTempoReale, type FaseGiorno } from '../../engine/time'
import { gameStore } from '../../store'

/** Celle attraversate in un secondo. */
const VELOCITA = 3.5

const COLORE_SUOLO: Record<Cella, number> = {
  strada: 0x2f333d,
  marciapiede: 0x4a515e,
  parco: 0x37613f,
  edificio: 0x3a3f4b,
}

/** Il cielo cambia con l'ora del giorno: il tempo di gioco si vede sulla mappa. */
const CIELO: Record<FaseGiorno, number> = {
  notte: 0x0b0e14,
  mattina: 0x1d2735,
  pomeriggio: 0x243040,
  sera: 0x2a1f2e,
}

/**
 * La città in vista isometrica.
 *
 * Tutta la matematica della proiezione vive in `engine/iso.ts`: qui si disegna
 * soltanto. Le forme sono segnaposto — quando arriveranno gli sprite prenderanno
 * il posto dei poligoni senza toccare la logica.
 */
export class CityScene extends Phaser.Scene {
  private mappa: Cella[][] = []
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.Container
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private faseCorrente: FaseGiorno | null = null

  constructor() {
    super('city')
  }

  create() {
    this.mappa = generaCitta()
    this.pos = puntoDiPartenza(this.mappa)

    this.disegnaSuolo()
    this.disegnaEdifici()
    this.giocatore = this.creaGiocatore()

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd

    this.impostaCamera()
    this.aggiornaGiocatore()
  }

  update(_time: number, deltaMs: number) {
    this.muovi(deltaMs / 1000)
    this.aggiornaGiocatore()

    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
    this.aggiornaCielo()
  }

  // ---------------------------------------------------------------- movimento

  private muovi(deltaSec: number) {
    const { dir, intensita } = this.direzioneRichiesta()

    if (intensita === 0) return

    const passo = VELOCITA * deltaSec * intensita

    // Un asse per volta: così sfiorando un muro si scivola invece di incastrarsi.
    const nuovaX = this.pos.x + dir.x * passo
    if (calpestabile(this.mappa, nuovaX, this.pos.y)) this.pos.x = nuovaX

    const nuovaY = this.pos.y + dir.y * passo
    if (calpestabile(this.mappa, this.pos.x, nuovaY)) this.pos.y = nuovaY
  }

  /**
   * Unisce le due sorgenti di comando: tastiera e joystick touch.
   *
   * Il joystick ha la precedenza se lo stai usando, così su un tablet con
   * tastiera collegata i due non si disturbano a vicenda.
   */
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
    // Mezza cella di margine: entrando in una fascia, il personaggio ci passa davanti.
    this.giocatore.setDepth(profondita(this.pos) + 0.5)
  }

  // ---------------------------------------------------------------- rendering

  private disegnaSuolo() {
    const g = this.add.graphics()
    g.setDepth(-1000)

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        const tipo = this.mappa[y][x]
        g.fillStyle(COLORE_SUOLO[tipo], 1)
        g.lineStyle(1, 0x000000, 0.18)
        g.fillPoints(this.puntiCella({ x, y }), true)
        g.strokePoints(this.puntiCella({ x, y }), true)
      }
    }
  }

  /**
   * Gli edifici sono raggruppati per fascia diagonale.
   *
   * Tutte le celle con la stessa somma x+y stanno sulla stessa linea isometrica e
   * non possono coprirsi tra loro: possono quindi condividere un solo oggetto di
   * disegno. Centinaia di edifici diventano qualche decina di draw call.
   */
  private disegnaEdifici() {
    const perFascia = new Map<number, Griglia[]>()

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'edificio') continue
        const fascia = profondita({ x, y })
        if (!perFascia.has(fascia)) perFascia.set(fascia, [])
        perFascia.get(fascia)!.push({ x, y })
      }
    }

    for (const [fascia, celle] of perFascia) {
      const g = this.add.graphics()
      g.setDepth(fascia)
      for (const cella of celle) this.disegnaPalazzo(g, cella)
    }
  }

  private disegnaPalazzo(g: Phaser.GameObjects.Graphics, cella: Griglia) {
    const h = pianiEdificio(cella.x, cella.y) * ALTEZZA_PIANO
    const [tx, ty, rx, ry, bx, by, lx, ly] = verticiCella(cella)

    // Faccia sinistra, in ombra.
    g.fillStyle(0x2b3140, 1)
    g.fillPoints(
      [
        new Phaser.Math.Vector2(lx, ly - h),
        new Phaser.Math.Vector2(lx, ly),
        new Phaser.Math.Vector2(bx, by),
        new Phaser.Math.Vector2(bx, by - h),
      ],
      true,
    )

    // Faccia destra, illuminata di taglio.
    g.fillStyle(0x3b4354, 1)
    g.fillPoints(
      [
        new Phaser.Math.Vector2(bx, by - h),
        new Phaser.Math.Vector2(bx, by),
        new Phaser.Math.Vector2(rx, ry),
        new Phaser.Math.Vector2(rx, ry - h),
      ],
      true,
    )

    // Tetto.
    g.fillStyle(0x515b70, 1)
    g.lineStyle(1, 0x232936, 1)
    const tetto = [
      new Phaser.Math.Vector2(tx, ty - h),
      new Phaser.Math.Vector2(rx, ry - h),
      new Phaser.Math.Vector2(bx, by - h),
      new Phaser.Math.Vector2(lx, ly - h),
    ]
    g.fillPoints(tetto, true)
    g.strokePoints(tetto, true)

    this.disegnaFinestre(g, cella, h)
  }

  private disegnaFinestre(
    g: Phaser.GameObjects.Graphics,
    cella: Griglia,
    altezza: number,
  ) {
    const { sx, sy } = grigliaASchermo(cella)
    const piani = Math.floor(altezza / ALTEZZA_PIANO)

    g.fillStyle(0xe8c170, 0.75)
    for (let piano = 0; piano < piani; piano++) {
      // Accese in modo irregolare, ma sempre le stesse: niente sfarfallio.
      const acceso = Math.sin(cella.x * 3.1 + cella.y * 7.7 + piano * 2.3) > 0.25
      if (!acceso) continue

      const yFinestra = sy + TILE_H / 4 - piano * ALTEZZA_PIANO - ALTEZZA_PIANO / 2
      g.fillRect(sx + 6, yFinestra, 6, 7)
      g.fillRect(sx - 12, yFinestra, 6, 7)
    }
  }

  private creaGiocatore(): Phaser.GameObjects.Container {
    const ombra = this.add.ellipse(0, 0, TILE_W * 0.4, TILE_H * 0.4, 0x000000, 0.35)
    const corpo = this.add.rectangle(0, -16, 12, 22, 0xd88c3f)
    corpo.setStrokeStyle(1, 0x2b2b2b)
    const testa = this.add.circle(0, -32, 6, 0xf0c9a0)
    testa.setStrokeStyle(1, 0x2b2b2b)

    return this.add.container(0, 0, [ombra, corpo, testa])
  }

  private aggiornaCielo() {
    const fase = faseGiorno(gameStore.getState().tempo)
    if (fase === this.faseCorrente) return

    this.faseCorrente = fase
    this.cameras.main.setBackgroundColor(CIELO[fase])
  }

  private impostaCamera() {
    const lato = this.mappa.length
    const larghezza = lato * TILE_W
    const altezza = lato * TILE_H + 6 * ALTEZZA_PIANO

    this.cameras.main.setBounds(
      -larghezza / 2,
      -4 * ALTEZZA_PIANO,
      larghezza,
      altezza,
    )
    this.cameras.main.startFollow(this.giocatore, true, 0.08, 0.08)
    this.cameras.main.setBackgroundColor(CIELO.mattina)
  }

  private puntiCella(cella: Griglia): Phaser.Math.Vector2[] {
    const v = verticiCella(cella)
    return [
      new Phaser.Math.Vector2(v[0], v[1]),
      new Phaser.Math.Vector2(v[2], v[3]),
      new Phaser.Math.Vector2(v[4], v[5]),
      new Phaser.Math.Vector2(v[6], v[7]),
    ]
  }
}
