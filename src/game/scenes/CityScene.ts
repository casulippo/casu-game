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
  pianiEdificio,
  puntoDiPartenza,
  terrenoSotto,
  tintaEdificio,
  type Cella,
} from '../../engine/city'
import { quartiereIn } from '../../engine/quartieri'
import { ARREDO, type Arredo } from '../../engine/arredo'
import { LUOGHI, celleOccupate, type Luogo } from '../../engine/luoghi'
import { interazioneInCitta } from '../../engine/interazione'
import { illuminazione } from '../../engine/illuminazione'
import { oreDaTempoReale } from '../../engine/time'
import { gameStore } from '../../store'
import { leggiSpinta } from '../input'
import { Luminosi, creaGiocatore, puntiDaVertici } from './comuni'
import {
  caricaTexture,
  costruisciSuolo,
  materialeMarciapiede,
  materialeStrada,
  preparaTile,
} from '../terreno'

/** Celle attraversate in un secondo. */
const VELOCITA = 3.5

/** Il marciapiede sta un gradino sopra l'asfalto: è ciò che dà spessore alla strada. */
const ALTEZZA_CORDOLO = 7

interface Aspetto {
  sinistra: number
  destra: number
  tetto: number
  insegna: number
}

const ASPETTO: Record<string, Aspetto> = {
  supermercato: {
    sinistra: 0x8d5638,
    destra: 0xba7248,
    tetto: 0x69717d,
    insegna: 0x2f9c62,
  },
  casa: {
    sinistra: 0x7d7160,
    destra: 0xab9a80,
    tetto: 0xa8442f,
    insegna: 0xd8a24a,
  },
}

/**
 * La città in vista isometrica.
 *
 * La matematica della proiezione vive in `engine/iso.ts`, la mappa in
 * `engine/city.ts`, la luce in `engine/illuminazione.ts`: qui si disegna soltanto.
 */
export class CityScene extends Phaser.Scene {
  private mappa: Cella[][] = []
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.Container
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private tastoAzione!: Phaser.Input.Keyboard.Key
  private luminosi = new Luminosi()
  private velo!: Phaser.GameObjects.Rectangle
  /** Le celle occupate dai luoghi con nome, che si disegnano a parte. */
  private celleDeiLuoghi = new Set<string>()
  constructor() {
    super('city')
  }

  preload() {
    caricaTexture(this)
  }

  create() {
    preparaTile(this)

    this.mappa = generaCitta()
    this.pos = this.registry.get('posCitta') ?? puntoDiPartenza(this.mappa)
    this.luminosi = new Luminosi()

    this.celleDeiLuoghi = new Set(
      LUOGHI.flatMap((l) => celleOccupate(l)).map((c) => `${c.x},${c.y}`),
    )

    this.disegnaMare()
    this.disegnaTerreno()
    this.disegnaPalazzi()
    this.disegnaAlberi()
    this.disegnaArredo()
    this.disegnaLuoghi()
    this.giocatore = creaGiocatore(this)
    this.velo = this.creaVelo()

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
    this.tastoAzione = this.input.keyboard!.addKey('E')

    this.impostaCamera()
    this.aggiornaGiocatore()
    this.aggiornaLuce()
  }

  update(_time: number, deltaMs: number) {
    this.muovi(deltaMs / 1000)
    this.aggiornaGiocatore()
    this.aggiornaInterazione()
    this.controllaIngresso()

    gameStore.getState().avanzaTempo(oreDaTempoReale(deltaMs))
    this.aggiornaLuce()
  }

  // ------------------------------------------------------------------- luce

  /**
   * L'illuminazione segue l'ora di gioco: un velo colorato moltiplicato sopra
   * la scena, e le luci artificiali che si accendono al calare del sole.
   */
  private aggiornaLuce() {
    const luce = illuminazione(gameStore.getState().tempo)

    this.cameras.main.setBackgroundColor(luce.cielo)
    this.velo.setFillStyle(luce.tinta)
    this.luminosi.applica(luce.luci)
  }

  /** Il velo copre lo schermo e non scorre con la camera. */
  private creaVelo(): Phaser.GameObjects.Rectangle {
    const velo = this.add.rectangle(0, 0, 10, 10, 0xffffff)
    velo.setOrigin(0, 0)
    velo.setScrollFactor(0)
    velo.setDepth(100_000)
    velo.setBlendMode(Phaser.BlendModes.MULTIPLY)

    const adatta = () => velo.setSize(this.scale.width, this.scale.height)
    adatta()
    this.scale.on('resize', adatta)
    this.events.once('shutdown', () => this.scale.off('resize', adatta))

    return velo
  }

  // -------------------------------------------------------------- interazione

  private aggiornaInterazione() {
    gameStore.getState().segnalaInterazione(interazioneInCitta(this.pos))
  }

  private controllaIngresso() {
    const stato = gameStore.getState()

    if (stato.ambiente === 'interno') {
      this.registry.set('posCitta', this.pos)
      this.scene.start('interno')
      return
    }

    if (!Phaser.Input.Keyboard.JustDown(this.tastoAzione)) return

    const azione = interazioneInCitta(this.pos)
    if (azione?.tipo === 'entra') stato.entraIn(azione.luogo.id)
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
    const rialzo = this.suMarciapiede() ? ALTEZZA_CORDOLO : 0

    this.giocatore.setPosition(sx, sy - rialzo)
    this.giocatore.setDepth(profondita(this.pos) + 0.5)
  }

  /** Camminando sul marciapiede si sta un gradino più in alto. */
  private suMarciapiede(): boolean {
    const terreno = terrenoSotto(Math.floor(this.pos.x), Math.floor(this.pos.y))
    return terreno === 'marciapiede'
  }

  // ---------------------------------------------------------------- rendering

  /**
   * Il suolo, stampato una volta sola su un'unica immagine.
   *
   * Ogni cella è un rombo ritagliato dalle texture. Disegnarle come oggetti
   * separati significherebbe migliaia di sprite; qui il risultato è un solo
   * oggetto, dipinto in fase di avvio.
   *
   * Terreno e cordoli stanno insieme perché vivono entrambi a livello del
   * suolo: dipingerli in ordine di fascia risolve da sé le sovrapposizioni.
   */
  private disegnaTerreno() {
    const suolo = costruisciSuolo(this, this.mappa.length, (x, y) => {
      const terreno = terrenoSotto(x, y)
      if (terreno === 'acqua') {
        return { materiale: null, rialzo: 0, coloreCordolo: null }
      }

      const q = quartiereIn(x, y)
      const marciapiede = terreno === 'marciapiede'
      const rialzo = marciapiede
        ? q.pavimentazione === 'sterrato'
          ? 2
          : ALTEZZA_CORDOLO
        : 0

      return {
        materiale:
          terreno === 'strada'
            ? materialeStrada(q.pavimentazione)
            : marciapiede
              ? materialeMarciapiede(q.pavimentazione)
              : 'erba',
        rialzo,
        coloreCordolo: marciapiede ? q.marciapiede : null,
      }
    })

    if (!suolo) return

    const immagine = this.add.image(suolo.x, suolo.y, suolo.chiave)
    immagine.setOrigin(0, 0)
    immagine.setDepth(-1000)
  }

  /** Il mare, dipinto sotto tutto il resto. */
  private disegnaMare() {
    const g = this.add.graphics()
    g.setDepth(-1200)
    g.fillStyle(0x1e3f5c, 1)

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'acqua') continue
        g.fillPoints(puntiDaVertici(verticiCella({ x, y })), true)
      }
    }
  }

  /**
   * Il tessuto edilizio dei quartieri: gli edifici senza nome.
   *
   * Raggruppati per fascia diagonale — le celle con la stessa somma x+y non
   * possono coprirsi tra loro, quindi condividono un oggetto di disegno.
   * Migliaia di edifici diventano qualche decina di draw call.
   */
  private disegnaPalazzi() {
    const perFascia = new Map<number, Griglia[]>()

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'edificio') continue
        if (this.celleDeiLuoghi.has(`${x},${y}`)) continue

        const fascia = profondita({ x, y })
        if (!perFascia.has(fascia)) perFascia.set(fascia, [])
        perFascia.get(fascia)!.push({ x, y })
      }
    }

    for (const [fascia, celle] of perFascia) {
      const volumi = this.add.graphics()
      volumi.setDepth(fascia)

      // Le finestre della fascia stanno in un secondo livello, la cui opacità
      // varia tutta insieme col calare della luce. Come oggetti separati
      // sarebbero decine di migliaia di sprite; così sono un disegno per fascia.
      const finestre = this.add.graphics()
      finestre.setDepth(fascia + 0.1)
      this.luminosi.aggiungi(finestre, 0.85, 0.06)

      for (const cella of celle) {
        const tinta = tintaEdificio(cella.x, cella.y)
        const altezza = pianiEdificio(cella.x, cella.y) * ALTEZZA_PIANO

        this.blocco(volumi, cella, altezza, {
          sinistra: scurisci(tinta, 0.62),
          destra: scurisci(tinta, 0.82),
          sopra: scurisci(tinta, 0.5),
        })

        this.finestreDiFacciata(finestre, cella, altezza)
      }
    }
  }

  /** Le finestre dei palazzi anonimi, che si accendono la sera. */
  private finestreDiFacciata(
    g: Phaser.GameObjects.Graphics,
    cella: Griglia,
    altezza: number,
  ) {
    const q = quartiereIn(cella.x, cella.y)
    const piani = Math.floor(altezza / ALTEZZA_PIANO)
    const { sx, sy } = grigliaASchermo(cella)

    g.fillStyle(q.neon ? 0xff6bd8 : 0xffd28a, 1)

    for (let piano = 0; piano < piani; piano++) {
      // Accese in modo irregolare ma stabile: niente sfarfallio a ogni frame.
      if (Math.sin(cella.x * 3.1 + cella.y * 7.7 + piano * 2.3) < 0.15) continue

      const y = sy - piano * ALTEZZA_PIANO - ALTEZZA_PIANO * 0.7
      g.fillRect(sx + 5, y, 6, 8)
      g.fillRect(sx - 11, y, 6, 8)
    }
  }

  /** Un solo oggetto di disegno per fascia, non uno per albero. */
  private disegnaAlberi() {
    const perFascia = new Map<number, Phaser.GameObjects.Graphics>()

    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'albero') continue

        const { sx, sy } = grigliaASchermo({ x, y })
        const fascia = profondita({ x, y })

        if (!perFascia.has(fascia)) {
          const nuovo = this.add.graphics()
          nuovo.setDepth(fascia)
          perFascia.set(fascia, nuovo)
        }
        const g = perFascia.get(fascia)!

        g.fillStyle(0x000000, 0.28)
        g.fillEllipse(sx, sy + 2, TILE_W * 0.34, TILE_H * 0.34)
        g.fillStyle(0x53422f, 1)
        g.fillRect(sx - 3, sy - 28, 6, 28)
        g.fillStyle(0x2f6039, 1)
        g.fillCircle(sx, sy - 36, 16)
        g.fillStyle(0x3d7a48, 1)
        g.fillCircle(sx - 6, sy - 42, 11)
        g.fillStyle(0x4d9257, 1)
        g.fillCircle(sx + 5, sy - 45, 7)
      }
    }
  }

  private disegnaArredo() {
    for (const pezzo of ARREDO) {
      switch (pezzo.tipo) {
        case 'lampione':
          this.disegnaLampione(pezzo)
          break
        case 'auto':
          this.disegnaAuto(pezzo)
          break
        case 'cassonetto':
          this.blocchetto(pezzo, 15, 0x2f5c46, 0x3b7256, 0x498a68)
          break
        case 'panchina':
          this.disegnaPanchina(pezzo)
          break
        case 'cespuglio':
          this.disegnaCespuglio(pezzo)
          break
      }
    }
  }

  private disegnaLampione(pezzo: Arredo) {
    const { sx, sy } = grigliaASchermo(pezzo)
    const base = sy - ALTEZZA_CORDOLO
    const altezza = 62

    const g = this.add.graphics()
    g.setDepth(profondita(pezzo))
    g.fillStyle(0x000000, 0.25)
    g.fillEllipse(sx, base + 2, TILE_W * 0.22, TILE_H * 0.22)
    g.fillStyle(0x3c4350, 1)
    g.fillRect(sx - 2, base - altezza, 4, altezza)
    g.fillStyle(0x4a5260, 1)
    g.fillRect(sx - 7, base - altezza - 5, 14, 6)

    // La lampada e il suo alone si accendono col buio.
    const lampada = this.add.circle(sx, base - altezza - 1, 4, 0xffd9a0)
    lampada.setDepth(profondita(pezzo) + 0.1)
    this.luminosi.aggiungi(lampada, 1)

    const alone = this.add.circle(sx, base - altezza + 4, 46, 0xffc46b)
    alone.setDepth(profondita(pezzo) - 0.2)
    alone.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(alone, 0.16)

    // Il cerchio di luce a terra.
    const pozza = this.add.ellipse(sx, base + 4, TILE_W * 1.5, TILE_H * 1.5, 0xffc46b)
    pozza.setDepth(-999)
    pozza.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(pozza, 0.12)
  }

  private disegnaAuto(pezzo: Arredo) {
    const { sx, sy } = grigliaASchermo(pezzo)
    const colori = [0x8c3b3b, 0x2f5b8c, 0x3f6b4a, 0x8a7a3f]
    const colore = colori[(pezzo.x * 3 + pezzo.y * 7) % colori.length]

    const g = this.add.graphics()
    g.setDepth(profondita(pezzo))

    g.fillStyle(0x000000, 0.3)
    g.fillEllipse(sx, sy + 3, TILE_W * 0.62, TILE_H * 0.55)

    this.blocco(g, pezzo, 13, {
      sinistra: scurisci(colore, 0.7),
      destra: colore,
      sopra: schiarisci(colore, 1.15),
    })

    // L'abitacolo, un blocchetto più stretto e scuro sopra la scocca.
    const { sx: cx, sy: cy } = grigliaASchermo(pezzo)
    g.fillStyle(0x1e2530, 0.9)
    g.fillEllipse(cx, cy - 20, TILE_W * 0.34, TILE_H * 0.42)
  }

  private disegnaPanchina(pezzo: Arredo) {
    const { sx, sy } = grigliaASchermo(pezzo)
    const g = this.add.graphics()
    g.setDepth(profondita(pezzo))

    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(sx, sy + 2, TILE_W * 0.42, TILE_H * 0.4)
    this.blocco(g, pezzo, 9, {
      sinistra: 0x6b4f33,
      destra: 0x82613f,
      sopra: 0x99754d,
    })
    g.fillStyle(0x6b4f33, 1)
    g.fillRect(sx - 12, sy - 26, 24, 9)
  }

  private disegnaCespuglio(pezzo: Arredo) {
    const { sx, sy } = grigliaASchermo(pezzo)
    const g = this.add.graphics()
    g.setDepth(profondita(pezzo))

    g.fillStyle(0x000000, 0.22)
    g.fillEllipse(sx, sy + 2, TILE_W * 0.4, TILE_H * 0.4)
    g.fillStyle(0x2f5f3a, 1)
    g.fillCircle(sx - 6, sy - 8, 10)
    g.fillStyle(0x3a7346, 1)
    g.fillCircle(sx + 5, sy - 10, 9)
    g.fillStyle(0x458553, 1)
    g.fillCircle(sx, sy - 15, 8)
  }

  private blocchetto(
    cella: Griglia,
    altezza: number,
    sinistra: number,
    destra: number,
    sopra: number,
  ) {
    const g = this.add.graphics()
    g.setDepth(profondita(cella))
    const { sx, sy } = grigliaASchermo(cella)
    g.fillStyle(0x000000, 0.25)
    g.fillEllipse(sx, sy + 2, TILE_W * 0.42, TILE_H * 0.4)
    this.blocco(g, cella, altezza, { sinistra, destra, sopra })
  }

  private disegnaLuoghi() {
    for (const luogo of LUOGHI) {
      this.disegnaEdificio(luogo)
      this.disegnaSoglia(luogo)
      this.disegnaInsegna(luogo)
    }
  }

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

    g.fillStyle(aspetto.sinistra, 1)
    g.fillPoints(puntiDaVertici([lx, ly - h, lx, ly, bx, by, bx, by - h]), true)

    g.fillStyle(aspetto.destra, 1)
    g.fillPoints(puntiDaVertici([bx, by - h, bx, by, rx, ry, rx, ry - h]), true)

    // Una fascia di zoccolatura in basso: l'edificio poggia invece di galleggiare.
    g.fillStyle(scurisci(aspetto.sinistra, 0.75), 1)
    g.fillPoints(puntiDaVertici([lx, ly - 9, lx, ly, bx, by, bx, by - 9]), true)
    g.fillStyle(scurisci(aspetto.destra, 0.75), 1)
    g.fillPoints(puntiDaVertici([bx, by - 9, bx, by, rx, ry, rx, ry - 9]), true)

    g.fillStyle(aspetto.tetto, 1)
    g.lineStyle(1, 0x1e222b, 0.85)
    const tetto = puntiDaVertici([tx, ty - h, rx, ry - h, bx, by - h, lx, ly - h])
    g.fillPoints(tetto, true)
    g.strokePoints(tetto, true)

    this.disegnaFinestre(luogo, { bx, by, lx, ly, rx, ry }, h)
  }

  /** Le finestre sono oggetti a sé: devono potersi accendere la sera. */
  private disegnaFinestre(
    luogo: Luogo,
    v: { bx: number; by: number; lx: number; ly: number; rx: number; ry: number },
    altezza: number,
  ) {
    const depth = profondita({
      x: luogo.origine.x + luogo.larghezza - 1,
      y: luogo.origine.y + luogo.profondita - 1,
    })
    const acceso = luogo.tipo === 'supermercato' ? 0xa9e4cc : 0xffd28a

    const passi = luogo.tipo === 'supermercato' ? 5 : 2
    const altezzaVetrina = luogo.tipo === 'supermercato' ? 20 : 12
    const larghezzaVetrina = luogo.tipo === 'supermercato' ? 15 : 11

    for (let i = 1; i <= passi; i++) {
      const t = i / (passi + 1)
      const x = v.bx + (v.rx - v.bx) * t
      const y = v.by + (v.ry - v.by) * t

      // Piano terra su un lato, primo piano se l'edificio è alto.
      const quote = luogo.tipo === 'supermercato' ? [26] : [26, altezza - 12]

      for (const quota of quote) {
        const vetro = this.add.rectangle(
          x,
          y - quota,
          larghezzaVetrina,
          altezzaVetrina,
          acceso,
        )
        vetro.setDepth(depth + 0.1)
        this.luminosi.aggiungi(vetro, 0.85, 0.12)
      }
    }
  }

  private disegnaSoglia(luogo: Luogo) {
    const g = this.add.graphics()
    g.setDepth(profondita(luogo.porta) - 0.5)

    const colore = luogo.accessibile ? 0xe0b25c : 0x6b7280
    g.fillStyle(colore, luogo.accessibile ? 0.9 : 0.55)
    g.fillPoints(puntiDaVertici(verticiCella(luogo.porta)), true)

    if (!luogo.accessibile) return

    // Una luce sopra la porta di ciò che è aperto.
    const { sx, sy } = grigliaASchermo(luogo.porta)
    const alone = this.add.ellipse(sx, sy - 4, TILE_W * 1.1, TILE_H * 1.1, 0xffc46b)
    alone.setDepth(profondita(luogo.porta) - 0.4)
    alone.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(alone, 0.2)
  }

  private disegnaInsegna(luogo: Luogo) {
    const centro = {
      x: luogo.origine.x + (luogo.larghezza - 1) / 2,
      y: luogo.origine.y + (luogo.profondita - 1) / 2,
    }
    const { sx, sy } = grigliaASchermo(centro)
    const altezza = luogo.piani * ALTEZZA_PIANO

    const testo = this.add.text(sx, sy - altezza - 32, luogo.nome.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      backgroundColor: coloreCss(ASPETTO[luogo.tipo].insegna),
      padding: { x: 8, y: 3 },
    })
    testo.setOrigin(0.5, 1)
    testo.setDepth(10_000)

    // Di notte l'insegna alona come un neon.
    const neon = this.add.rectangle(
      sx,
      sy - altezza - 32 - testo.height / 2,
      testo.width + 16,
      testo.height + 12,
      ASPETTO[luogo.tipo].insegna,
    )
    neon.setDepth(9_999)
    neon.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(neon, 0.4)

    if (!luogo.accessibile && luogo.motivoChiusura) {
      const chiuso = this.add.text(sx, sy - altezza - 16, luogo.motivoChiusura, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#cbd5e1',
        backgroundColor: 'rgba(15,23,42,0.8)',
        padding: { x: 5, y: 2 },
      })
      chiuso.setOrigin(0.5, 1)
      chiuso.setDepth(10_000)
    }
  }

  /** Un prisma isometrico alto `altezza` sulla cella indicata. */
  private blocco(
    g: Phaser.GameObjects.Graphics,
    cella: Griglia,
    altezza: number,
    colori: { sinistra: number; destra: number; sopra: number },
  ) {
    const [tx, ty, rx, ry, bx, by, lx, ly] = verticiCella(cella)

    g.fillStyle(colori.sinistra, 1)
    g.fillPoints(
      puntiDaVertici([lx, ly - altezza, lx, ly, bx, by, bx, by - altezza]),
      true,
    )

    g.fillStyle(colori.destra, 1)
    g.fillPoints(
      puntiDaVertici([bx, by - altezza, bx, by, rx, ry, rx, ry - altezza]),
      true,
    )

    g.fillStyle(colori.sopra, 1)
    g.fillPoints(
      puntiDaVertici([
        tx,
        ty - altezza,
        rx,
        ry - altezza,
        bx,
        by - altezza,
        lx,
        ly - altezza,
      ]),
      true,
    )
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
    // Nessuna interpolazione e nessun arrotondamento: la camera sta esattamente
    // sul giocatore. Qualunque scarto tra i due si vedrebbe come tremolio del
    // mondo mentre ci si muove.
    this.cameras.main.startFollow(this.giocatore, false, 1, 1)
  }
}

function coloreCss(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

function scurisci(colore: number, fattore: number): number {
  return scala(colore, fattore)
}

function schiarisci(colore: number, fattore: number): number {
  return scala(colore, fattore)
}

function scala(colore: number, fattore: number): number {
  const canale = (spostamento: number) =>
    Math.min(255, Math.round(((colore >> spostamento) & 0xff) * fattore))
  return (canale(16) << 16) | (canale(8) << 8) | canale(0)
}
