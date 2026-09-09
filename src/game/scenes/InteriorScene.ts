import Phaser from 'phaser'
import {
  TILE_H,
  TILE_W,
  direzioneDaVettoreSchermo,
  direzioneSchermoAGriglia,
  grigliaASchermo,
  profondita,
  type Griglia,
} from '../../engine/iso'
import {
  calpestabileInterno,
  celleDelMobile,
  generaInterno,
  ingresso,
  type Interno,
  type Mobile,
} from '../../engine/interni'
import { interazioneInInterno } from '../../engine/interazione'
import { oreDaTempoReale } from '../../engine/time'
import { gameStore } from '../../store'
import { leggiSpinta } from '../input'
import { creaGiocatore } from './comuni'
import { caricaPersonaggi, creaPersonaggio, type Personaggio } from '../personaggio'
import { costruisciStanza, disegnaMobile } from '../interni'

const VELOCITA = 3.2

/**
 * L'interno di una casa.
 *
 * Stessa vista dall'alto dell'esterno e stesso linguaggio visivo: pianta
 * piatta, con una fascia di parete sul lato verso chi guarda. Prima qui si
 * disegnavano prismi isometrici, rimasti da quando la città era in
 * isometrica — dentro e fuori sembravano due giochi diversi.
 */
export class InteriorScene extends Phaser.Scene {
  private interno!: Interno
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.GameObject & {
    setPosition(x: number, y: number): unknown
    setDepth(v: number): unknown
  }
  private protagonista: Personaggio | null = null
  private ultimaDirezione: Griglia = { x: 0, y: 1 }
  private inMovimento = false
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private tastoAzione!: Phaser.Input.Keyboard.Key

  constructor() {
    super('interno')
  }

  preload() {
    caricaPersonaggi(this)
  }

  create() {
    const idCasa = gameStore.getState().luogoCorrente ?? 'casa'
    this.interno = generaInterno(idCasa)
    this.pos = ingresso(this.interno)

    this.disegnaStanza()
    this.disegnaMobili()

    this.protagonista = creaPersonaggio(this, 'kai', 0, 0)
    this.giocatore = this.protagonista?.sprite ?? creaGiocatore(this)

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
    this.aggiornaInterazione()
    this.controllaUscita()

    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
  }

  // -------------------------------------------------------------- interazione

  private aggiornaInterazione() {
    const stato = gameStore.getState()

    // Se lo store dice che siamo già fuori, la scena sta per cambiare: non
    // annunciare più un'azione da interno, o la UI si troverebbe in città con
    // in mano un letto in cui dormire.
    if (stato.ambiente !== 'interno') return

    stato.segnalaInterazione(interazioneInInterno(this.interno, this.pos))
  }

  private controllaUscita() {
    const stato = gameStore.getState()

    // Il pulsante touch scrive nello store: se siamo tornati fuori, cambia scena.
    if (stato.ambiente === 'citta') {
      this.scene.start('city')
      return
    }

    if (!Phaser.Input.Keyboard.JustDown(this.tastoAzione)) return

    const azione = interazioneInInterno(this.interno, this.pos)
    if (azione?.tipo === 'esci') stato.esci()
  }

  // ---------------------------------------------------------------- movimento

  private muovi(deltaSec: number) {
    const { dir, intensita } = this.direzioneRichiesta()
    this.inMovimento = intensita > 0
    if (intensita === 0) return

    this.ultimaDirezione = dir
    const passo = VELOCITA * deltaSec * intensita

    const nuovaX = this.pos.x + dir.x * passo
    if (calpestabileInterno(this.interno, nuovaX, this.pos.y)) this.pos.x = nuovaX

    const nuovaY = this.pos.y + dir.y * passo
    if (calpestabileInterno(this.interno, this.pos.x, nuovaY)) this.pos.y = nuovaY
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
    this.protagonista?.aggiorna(this.ultimaDirezione, this.inMovimento)
  }

  // ---------------------------------------------------------------- rendering

  private disegnaStanza() {
    const stanza = costruisciStanza(this, this.interno)
    if (!stanza) return

    const immagine = this.add.image(stanza.x, stanza.y, stanza.chiave)
    immagine.setOrigin(0, 0)
    immagine.setDepth(-1000)
  }

  private disegnaMobili() {
    for (const mobile of this.interno.mobili) this.piazzaMobile(mobile)
  }

  private piazzaMobile(mobile: Mobile) {
    const pezzo = disegnaMobile(this, mobile)
    if (!pezzo) return

    // Ancorato al bordo basso dell'ingombro, come gli edifici in città: la
    // parete del mobile sporge verso chi guarda.
    const celle = celleDelMobile(mobile)
    const ultima = celle[celle.length - 1]
    const centro = grigliaASchermo({
      x: mobile.origine.x + (mobile.larghezza - 1) / 2,
      y: ultima.y,
    })

    const immagine = this.add.image(centro.sx, centro.sy + TILE_H / 2, pezzo.chiave)
    immagine.setOrigin(pezzo.ancora.x, pezzo.ancora.y)
    immagine.setDepth(profondita({ x: mobile.origine.x, y: ultima.y }))
  }

  /** La casa sta tutta a schermo: la camera non insegue, inquadra e basta. */
  private centraCamera() {
    const larghezza = this.interno.celle[0].length
    const altezza = this.interno.celle.length

    const centro = grigliaASchermo({
      x: (larghezza - 1) / 2,
      y: (altezza - 1) / 2,
    })
    this.cameras.main.centerOn(centro.sx, centro.sy)

    // Un po' di margine attorno alle pareti, così la stanza non tocca i bordi.
    const zoomX = this.scale.width / ((larghezza + 2) * TILE_W)
    const zoomY = this.scale.height / ((altezza + 3) * TILE_H)
    this.cameras.main.setZoom(Math.min(zoomX, zoomY))
  }
}
