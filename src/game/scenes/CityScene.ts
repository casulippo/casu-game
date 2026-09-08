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
import {
  calpestabile,
  generaCitta,
  puntoDiPartenza,
  type Cella,
} from '../../engine/city'
import { LUOGHI, luogoAllaPortata, type Luogo } from '../../engine/luoghi'
import { faseGiorno, oreDaTempoReale, type FaseGiorno } from '../../engine/time'
import { gameStore } from '../../store'
import { leggiSpinta } from '../input'
import { creaGiocatore, puntiDaVertici } from './comuni'

/** Celle attraversate in un secondo. */
const VELOCITA = 3.5

const COLORE_SUOLO: Record<Cella, number> = {
  strada: 0x2f333d,
  marciapiede: 0x545c6b,
  erba: 0x35603f,
  albero: 0x2c4f36,
  edificio: 0x3a3f4b,
}

/** Il cielo cambia con l'ora del giorno: il tempo di gioco si vede sulla mappa. */
const CIELO: Record<FaseGiorno, number> = {
  notte: 0x0b0e14,
  mattina: 0x1d2735,
  pomeriggio: 0x243040,
  sera: 0x2a1f2e,
}

interface Aspetto {
  sinistra: number
  destra: number
  tetto: number
  insegna: number
}

const ASPETTO: Record<string, Aspetto> = {
  supermercato: {
    sinistra: 0x9c5f3c,
    destra: 0xc4794c,
    tetto: 0x6d7684,
    insegna: 0x3fa66a,
  },
  casa: {
    sinistra: 0x8a7d6b,
    destra: 0xb3a288,
    tetto: 0xa8442f,
    insegna: 0xd8a24a,
  },
}

/**
 * La città in vista isometrica.
 *
 * Tutta la matematica della proiezione vive in `engine/iso.ts`, la mappa e i
 * luoghi in `engine/city.ts` e `engine/luoghi.ts`: qui si disegna soltanto.
 */
export class CityScene extends Phaser.Scene {
  private mappa: Cella[][] = []
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.Container
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private tastoAzione!: Phaser.Input.Keyboard.Key
  private faseCorrente: FaseGiorno | null = null

  constructor() {
    super('city')
  }

  create() {
    this.mappa = generaCitta()
    this.pos = this.registry.get('posCitta') ?? puntoDiPartenza(this.mappa)

    this.disegnaSuolo()
    this.disegnaAlberi()
    this.disegnaLuoghi()
    this.giocatore = creaGiocatore(this)

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
    this.tastoAzione = this.input.keyboard!.addKey('E')

    this.impostaCamera()
    this.aggiornaGiocatore()
  }

  update(_time: number, deltaMs: number) {
    this.muovi(deltaMs / 1000)
    this.aggiornaGiocatore()
    this.aggiornaLuogoVicino()
    this.controllaIngresso()

    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
    this.aggiornaCielo()
  }

  // -------------------------------------------------------------- interazione

  private aggiornaLuogoVicino() {
    const luogo = luogoAllaPortata(this.pos)
    gameStore.getState().segnalaLuogoVicino(luogo?.id ?? null)
  }

  /**
   * L'ingresso può partire dal tasto E o dal pulsante touch, che scrive
   * direttamente nello store. In entrambi i casi si finisce qui.
   */
  private controllaIngresso() {
    const stato = gameStore.getState()

    if (stato.ambiente === 'interno') {
      this.registry.set('posCitta', this.pos)
      this.scene.start('interno')
      return
    }

    if (!Phaser.Input.Keyboard.JustDown(this.tastoAzione)) return

    const luogo = luogoAllaPortata(this.pos)
    if (luogo?.accessibile) stato.entraIn(luogo.id)
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
        g.fillStyle(COLORE_SUOLO[tipo === 'albero' ? 'erba' : tipo], 1)
        g.lineStyle(1, 0x000000, 0.14)
        const punti = puntiDaVertici(verticiCella({ x, y }))
        g.fillPoints(punti, true)
        g.strokePoints(punti, true)
      }
    }

    this.disegnaStriscePedonali(g)
  }

  /** Qualche riga bianca sull'asfalto: la strada smette di sembrare un tappeto. */
  private disegnaStriscePedonali(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0xd8d8d8, 0.5)
    for (let x = 1; x < this.mappa.length - 1; x += 3) {
      const { sx, sy } = grigliaASchermo({ x: x + 0.5, y: 10.5 })
      g.fillEllipse(sx, sy, TILE_W * 0.36, TILE_H * 0.36)
    }
  }

  private disegnaAlberi() {
    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'albero') continue

        const { sx, sy } = grigliaASchermo({ x, y })
        const g = this.add.graphics()
        g.setDepth(profondita({ x, y }))

        g.fillStyle(0x000000, 0.25)
        g.fillEllipse(sx, sy + 2, TILE_W * 0.32, TILE_H * 0.32)
        g.fillStyle(0x5a4632, 1)
        g.fillRect(sx - 3, sy - 26, 6, 26)
        g.fillStyle(0x3f7a4a, 1)
        g.fillCircle(sx, sy - 34, 15)
        g.fillStyle(0x4b8f57, 1)
        g.fillCircle(sx - 5, sy - 39, 10)
      }
    }
  }

  private disegnaLuoghi() {
    for (const luogo of LUOGHI) {
      this.disegnaEdificio(luogo)
      this.disegnaSoglia(luogo)
      this.disegnaInsegna(luogo)
    }
  }

  /**
   * Un luogo è disegnato come un unico volume, non cella per cella:
   * l'ingombro può essere largo diverse celle ma l'edificio è uno solo.
   */
  private disegnaEdificio(luogo: Luogo) {
    const aspetto = ASPETTO[luogo.tipo]
    const h = luogo.piani * ALTEZZA_PIANO

    const x0 = luogo.origine.x
    const y0 = luogo.origine.y
    const x1 = x0 + luogo.larghezza - 1
    const y1 = y0 + luogo.profondita - 1

    const alto = grigliaASchermo({ x: x0, y: y0 })
    const destra = grigliaASchermo({ x: x1, y: y0 })
    const basso = grigliaASchermo({ x: x1, y: y1 })
    const sinistra = grigliaASchermo({ x: x0, y: y1 })

    const tx = alto.sx
    const ty = alto.sy - TILE_H / 2
    const rx = destra.sx + TILE_W / 2
    const ry = destra.sy
    const bx = basso.sx
    const by = basso.sy + TILE_H / 2
    const lx = sinistra.sx - TILE_W / 2
    const ly = sinistra.sy

    const g = this.add.graphics()
    g.setDepth(profondita({ x: x1, y: y1 }))

    // Faccia sinistra, in ombra.
    g.fillStyle(aspetto.sinistra, 1)
    g.fillPoints(
      puntiDaVertici([lx, ly - h, lx, ly, bx, by, bx, by - h]),
      true,
    )

    // Faccia destra, illuminata di taglio.
    g.fillStyle(aspetto.destra, 1)
    g.fillPoints(
      puntiDaVertici([bx, by - h, bx, by, rx, ry, rx, ry - h]),
      true,
    )

    // Tetto.
    g.fillStyle(aspetto.tetto, 1)
    g.lineStyle(1, 0x1e222b, 0.9)
    const tetto = puntiDaVertici([tx, ty - h, rx, ry - h, bx, by - h, lx, ly - h])
    g.fillPoints(tetto, true)
    g.strokePoints(tetto, true)

    this.disegnaVetrine(g, luogo, { bx, by, lx, ly, rx, ry })
  }

  private disegnaVetrine(
    g: Phaser.GameObjects.Graphics,
    luogo: Luogo,
    v: { bx: number; by: number; lx: number; ly: number; rx: number; ry: number },
  ) {
    const acceso = luogo.tipo === 'supermercato' ? 0x9fd8c0 : 0xe8c170

    if (luogo.tipo === 'supermercato') {
      // Una fascia continua di vetrine al piano terra.
      g.fillStyle(acceso, 0.8)
      const passi = 5
      for (let i = 1; i <= passi; i++) {
        const t = i / (passi + 1)
        const x = v.bx + (v.rx - v.bx) * t
        const y = v.by + (v.ry - v.by) * t
        g.fillRect(x - 7, y - 34, 14, 18)
      }
      return
    }

    // La casa ha finestre più piccole e sparse.
    g.fillStyle(acceso, 0.85)
    for (const t of [0.35, 0.7]) {
      const x = v.bx + (v.rx - v.bx) * t
      const y = v.by + (v.ry - v.by) * t
      g.fillRect(x - 5, y - 40, 10, 11)
    }
  }

  /** Un tappeto colorato sulla soglia: si capisce a colpo d'occhio dove si entra. */
  private disegnaSoglia(luogo: Luogo) {
    const g = this.add.graphics()
    g.setDepth(profondita(luogo.porta) - 0.5)

    const colore = luogo.accessibile ? 0xe0b25c : 0x6b7280
    g.fillStyle(colore, luogo.accessibile ? 0.85 : 0.5)
    g.fillPoints(puntiDaVertici(verticiCella(luogo.porta)), true)
  }

  private disegnaInsegna(luogo: Luogo) {
    const centro = {
      x: luogo.origine.x + (luogo.larghezza - 1) / 2,
      y: luogo.origine.y + (luogo.profondita - 1) / 2,
    }
    const { sx, sy } = grigliaASchermo(centro)
    const altezza = luogo.piani * ALTEZZA_PIANO

    const testo = this.add.text(sx, sy - altezza - 34, luogo.nome.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#f4f4f5',
      backgroundColor: coloreCss(ASPETTO[luogo.tipo].insegna),
      padding: { x: 7, y: 3 },
    })
    testo.setOrigin(0.5, 1)
    testo.setDepth(10_000)

    if (!luogo.accessibile && luogo.motivoChiusura) {
      const chiuso = this.add.text(sx, sy - altezza - 18, luogo.motivoChiusura, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#cbd5e1',
        backgroundColor: 'rgba(15,23,42,0.75)',
        padding: { x: 5, y: 2 },
      })
      chiuso.setOrigin(0.5, 1)
      chiuso.setDepth(10_000)
    }
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
    const altezza = lato * TILE_H + 8 * ALTEZZA_PIANO

    this.cameras.main.setBounds(
      -larghezza / 2,
      -6 * ALTEZZA_PIANO,
      larghezza,
      altezza,
    )
    this.cameras.main.startFollow(this.giocatore, true, 0.08, 0.08)
    this.cameras.main.setBackgroundColor(CIELO.mattina)
  }
}

function coloreCss(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}
