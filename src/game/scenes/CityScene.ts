import Phaser from 'phaser'
import {
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
  mezzeriaIn,
  parcoIn,
  puntoDiPartenza,
  strisceIn,
  terrenoSotto,
  type Cella,
} from '../../engine/city'
import { quartiereIn } from '../../engine/quartieri'
import { ARREDO, type Arredo } from '../../engine/arredo'
import { NPC, type Npc } from '../../engine/npc'
import { aggiornaNpc, statoInizialeNpc, type StatoNpc } from '../../engine/npcMovimento'
import { LUOGHI, type Luogo } from '../../engine/luoghi'
import { interazioneInCitta } from '../../engine/interazione'
import { spaccinoAllaPortata } from '../../engine/spaccini'
import { illuminazione } from '../../engine/illuminazione'
import { oreDaTempoReale } from '../../engine/time'
import { gameStore } from '../../store'
import { leggiSpinta } from '../input'
import {
  DIREZIONE_OMBRA,
  Luminosi,
  creaGiocatore,
  disegnaOmbra,
  puntiDaVertici,
} from './comuni'
import {
  caricaTerreno,
  costruisciSuolo,
  materialeMarciapiede,
  materialeStrada,
} from '../terreno'
import { disegnaLuogo } from '../edifici'
import {
  LUMINOSI,
  caricaArredo,
  muroPer,
  pezzoPer,
  preparaArredo,
} from '../arredoSprite'
import {
  caricaPersonaggi,
  creaPersonaggio,
  fotogrammaFermo,
  type Personaggio,
} from '../personaggio'
import {
  ALBERI,
  ancoraAlbero,
  ancoraVolume,
  caricaAlberi,
  chiaveAlbero,
  texturaAlone,
  texturaLampione,
  texturaVolume,
} from '../sprites'

/** L'aspetto dei pezzi di arredo che sono semplici volumi piatti. */
const STILE_ARREDO: Record<
  string,
  { tetto: number; facciata: number; larghezza: number; profondita: number; ellisse?: boolean }
> = {
  auto: { tetto: 0xa04747, facciata: 0x5c2f2f, larghezza: 40, profondita: 22 },
  cassonetto: { tetto: 0x498a68, facciata: 0x2f5c46, larghezza: 26, profondita: 20 },
  panchina: { tetto: 0x99754d, facciata: 0x6b4f33, larghezza: 34, profondita: 12 },
  cespuglio: {
    tetto: 0x458553,
    facciata: 0x2f5f3a,
    larghezza: 30,
    profondita: 26,
    ellisse: true,
  },
}

/** Celle attraversate in un secondo. */
const VELOCITA = 3.5

/** Il marciapiede sta un gradino sopra l'asfalto: è ciò che dà spessore alla strada. */
const ALTEZZA_CORDOLO = 7

/**
 * Il colore dell'insegna di ogni luogo.
 *
 * L'aspetto dell'edificio sta in `game/edifici.ts`: qui resta solo la targa,
 * che è un elemento della scena e non del disegno dell'edificio.
 */
const COLORE_INSEGNA: Record<string, number> = {
  supermercato: 0x2f9c62,
  casa: 0xd8a24a,
  bazar: 0xc9563f,
  armeria: 0x6f7f8c,
  'mercato-nero': 0x7d4b9c,
}

/** Un NPC con tutto ciò che gli serve per girovagare ed essere disegnato. */
interface NpcVivo {
  dati: Npc
  stato: StatoNpc
  personaggio: Personaggio
  ombra: Phaser.GameObjects.Ellipse
}

/** Distanza sotto la quale il giocatore urta un NPC invece di attraversarlo. */
const RAGGIO_URTO_NPC = 0.55

/**
 * La città vista dall'alto.
 *
 * La proiezione vive in `engine/iso.ts`, la mappa in `engine/city.ts`, le
 * strade in `engine/strade.ts`, la luce in `engine/illuminazione.ts`: qui si
 * disegna soltanto.
 */
export class CityScene extends Phaser.Scene {
  private mappa: Cella[][] = []
  private pos: Griglia = { x: 0, y: 0 }
  private giocatore!: Phaser.GameObjects.GameObject & {
    setPosition(x: number, y: number): unknown
    setDepth(v: number): unknown
  }
  private protagonista: Personaggio | null = null
  private ombraGiocatore!: Phaser.GameObjects.Ellipse
  private npcVivi: NpcVivo[] = []
  /** Il disegno dello scontro: nemici e proiettili, ridipinti a ogni frame. */
  private scontroGrafica!: Phaser.GameObjects.Graphics
  /** Minuti di gioco accumulati: ogni minuto la polizia tira il suo dado. */
  private minutiMaturati = 0
  private tastoFuoco!: Phaser.Input.Keyboard.Key
  private miraSchermo: Griglia | null = null
  private grilletto = false
  private ultimaDirezione: Griglia = { x: 1, y: 1 }
  private inMovimento = false
  private tasti!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private tastoAzione!: Phaser.Input.Keyboard.Key
  private luminosi = new Luminosi()
  private velo!: Phaser.GameObjects.Rectangle
  private ultimoAggiornamentoLuce = 0
  constructor() {
    super('city')
  }

  preload() {
    caricaArredo(this)
    caricaPersonaggi(this)
    caricaAlberi(this)
    caricaTerreno(this)
  }

  create() {
    preparaArredo(this)

    this.mappa = generaCitta()
    this.pos = this.registry.get('posCitta') ?? puntoDiPartenza(this.mappa)
    this.luminosi = new Luminosi()

    this.disegnaTerreno()
    this.disegnaAlberi()
    this.disegnaArredo()
    this.disegnaLuoghi()
    this.disegnaNpc()
    this.protagonista = creaPersonaggio(this, 'kai', 0, 0)
    this.giocatore = this.protagonista?.sprite ?? creaGiocatore(this)
    // Solo se il protagonista ha uno sprite disegnato: il fallback si porta
    // già dietro la sua ombra dentro il container, un'altra sarebbe doppia.
    this.ombraGiocatore = this.protagonista
      ? disegnaOmbra(this, TILE_W * 0.4, 6)
      : this.add.ellipse(0, 0, 0, 0, 0, 0)
    this.velo = this.creaVelo()

    this.tasti = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd
    this.tastoAzione = this.input.keyboard!.addKey('E')
    this.tastoFuoco = this.input.keyboard!.addKey('SPACE')
    this.scontroGrafica = this.add.graphics()
    this.scontroGrafica.setDepth(99_000)
    this.preparaFuoco()

    this.impostaCamera()
    this.aggiornaGiocatore()
    this.aggiornaLuce(true)
  }

  update(_time: number, deltaMs: number) {
    const deltaSec = deltaMs / 1000
    this.muovi(deltaSec)
    this.aggiornaGiocatore()
    this.aggiornaNpcVivi(deltaSec)
    this.aggiornaInterazione()
    this.aggiornaZona()
    this.controllaIngresso()

    const ore = oreDaTempoReale(deltaMs)
    gameStore.getState().avanzaTempo(ore)
    this.aggiornaScontro(deltaSec)
    this.contaIMinuti(ore)
    this.aggiornaLuce()
  }

  // ------------------------------------------------------------------- luce

  /**
   * L'illuminazione segue l'ora di gioco: un velo colorato moltiplicato sopra
   * la scena, e le luci artificiali che si accendono al calare del sole.
   */
  private aggiornaLuce(forza = false) {
    // Il ciclo giorno-notte dura un'ora reale: la luce cambia cosi lentamente
    // che ricalcolarla sessanta volte al secondo e lavoro sprecato, e
    // riassegnare colore di sfondo e velo a ogni frame costa.
    const adesso = this.time.now
    if (!forza && adesso - this.ultimoAggiornamentoLuce < 250) return
    this.ultimoAggiornamentoLuce = adesso

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
    const stato = gameStore.getState()

    // Passare da uno dei propri spaccini vale più di qualunque altra cosa ci
    // sia lì attorno: è l'unico modo di farsi dare i soldi.
    const spaccino = spaccinoAllaPortata(stato, this.pos)
    stato.segnalaInterazione(
      spaccino ? { tipo: 'spaccino', spaccino } : interazioneInCitta(this.pos),
    )
  }

  /**
   * Dove siamo, detto allo store.
   *
   * Il quartiere serve ai prezzi e al rischio, la cella agli spaccini, il parco
   * a sapere se si sta vendendo ai ragazzini. Lo store scarta da sé i valori
   * che non sono cambiati, così non si ridisegna la UI a ogni frame.
   */
  private aggiornaZona() {
    const stato = gameStore.getState()
    const cella = { x: Math.floor(this.pos.x), y: Math.floor(this.pos.y) }
    const quartiere = quartiereIn(cella.x, cella.y).id

    if (quartiere !== stato.quartiereCorrente) stato.vaiA(quartiere)
    stato.segnalaCella(cella)
    stato.segnalaParco(parcoIn(cella.x, cella.y))
  }

  // ------------------------------------------------------------------ scontro

  /**
   * Il grilletto.
   *
   * Si spara puntando: col mouse dove sta il puntatore, col dito dove si tocca,
   * con la barra spaziatrice dritto davanti a sé. Tenere premuto continua a
   * sparare — è la cadenza dell'arma a dire quanti colpi partono davvero.
   */
  private preparaFuoco() {
    const punta = (p: Phaser.Input.Pointer) => {
      const { sx, sy } = grigliaASchermo(this.pos)
      this.miraSchermo = direzioneDaVettoreSchermo(p.worldX - sx, p.worldY - sy)
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      punta(p)
      this.grilletto = true
    })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) punta(p)
    })
    this.input.on('pointerup', () => {
      this.grilletto = false
    })
  }

  /**
   * Un passo di scontro, e il suo disegno.
   *
   * Il giocatore continua a muoverlo la scena, che è l'unica ad avere le
   * collisioni: allo scontro si passa solo dove è finito.
   */
  private aggiornaScontro(deltaSec: number) {
    const stato = gameStore.getState()

    if (!stato.scontro) {
      this.scontroGrafica.clear()
      return
    }

    stato.combatti(deltaSec, {
      direzione: this.ultimaDirezione,
      posizione: this.pos,
      mira: this.miraSchermo,
      spara: this.grilletto || this.tastoFuoco.isDown,
    })

    this.disegnaScontro()
  }

  private disegnaScontro() {
    const scontro = gameStore.getState().scontro
    const g = this.scontroGrafica
    g.clear()
    if (!scontro) return

    for (const nemico of scontro.nemici) {
      const { sx, sy } = grigliaASchermo(nemico.pos)
      const colore = nemico.tipo === 'poliziotto' ? 0x3f6fd8 : 0xb8432f

      g.fillStyle(0x000000, 0.35)
      g.fillEllipse(sx, sy + 6, TILE_W * 0.42, TILE_H * 0.2)
      g.fillStyle(colore, 1)
      g.fillCircle(sx, sy - 10, TILE_W * 0.2)

      // La barra della vita solo a chi è già stato preso: piena non dice niente.
      if (nemico.vita < nemico.vitaMax) {
        const larghezza = TILE_W * 0.44
        g.fillStyle(0x000000, 0.5)
        g.fillRect(sx - larghezza / 2, sy - 28, larghezza, 4)
        g.fillStyle(0x6fd86f, 1)
        g.fillRect(sx - larghezza / 2, sy - 28, (larghezza * nemico.vita) / nemico.vitaMax, 4)
      }
    }

    g.fillStyle(0xffe08a, 1)
    for (const proiettile of scontro.proiettili) {
      const { sx, sy } = grigliaASchermo(proiettile.pos)
      g.fillCircle(sx, sy - 10, 3)
    }
  }

  /** Ogni minuto di gioco la polizia decide se venirti a prendere. */
  private contaIMinuti(ore: number) {
    this.minutiMaturati += ore * 60
    if (this.minutiMaturati < 1) return

    this.minutiMaturati = 0
    gameStore.getState().unMinuto(this.pos)
  }

  private controllaIngresso() {
    const stato = gameStore.getState()

    if (stato.ambiente === 'interno') {
      this.registry.set('posCitta', this.pos)
      this.scene.start('interno')
      return
    }

    if (!Phaser.Input.Keyboard.JustDown(this.tastoAzione)) return

    const azione = stato.interazione
    if (azione?.tipo === 'entra') stato.entraIn(azione.luogo.id)
    if (azione?.tipo === 'parla') stato.parlaCon(azione.npc.id)
    if (azione?.tipo === 'spaccino') stato.ritiraDa(azione.spaccino.id)
  }

  // ---------------------------------------------------------------- movimento

  private muovi(deltaSec: number) {
    const { dir, intensita } = this.direzioneRichiesta()
    this.inMovimento = intensita > 0
    if (intensita === 0) return

    this.ultimaDirezione = dir

    const passo = VELOCITA * deltaSec * intensita

    // Un asse per volta: così sfiorando un muro si scivola invece di incastrarsi.
    const nuovaX = this.pos.x + dir.x * passo
    if (calpestabile(this.mappa, nuovaX, this.pos.y) && !this.bloccatoDaNpc(nuovaX, this.pos.y)) {
      this.pos.x = nuovaX
    }

    const nuovaY = this.pos.y + dir.y * passo
    if (calpestabile(this.mappa, this.pos.x, nuovaY) && !this.bloccatoDaNpc(this.pos.x, nuovaY)) {
      this.pos.y = nuovaY
    }
  }

  /**
   * Gli NPC girovagano, quindi non possono essere bloccati sulla mappa
   * statica come l'arredo fisso: si controlla la loro posizione vera a ogni
   * passo, non quella con cui sono stati piazzati all'avvio.
   */
  private bloccatoDaNpc(x: number, y: number): boolean {
    return this.npcVivi.some(
      (vivo) => Math.hypot(vivo.stato.pos.x - x, vivo.stato.pos.y - y) < RAGGIO_URTO_NPC,
    )
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
    this.protagonista?.aggiorna(this.ultimaDirezione, this.inMovimento)

    if (this.protagonista) {
      this.ombraGiocatore.setPosition(
        sx + DIREZIONE_OMBRA.x * 6,
        sy - rialzo + DIREZIONE_OMBRA.y * 6,
      )
      this.ombraGiocatore.setDepth(profondita(this.pos) + 0.4)
    }
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
   * Disegnare ogni cella come oggetto separato significherebbe migliaia di
   * sprite; qui il risultato è una manciata di immagini, dipinte all'avvio.
   *
   * Terreno e cordoli stanno insieme perché vivono entrambi a livello del
   * suolo: dipingerli in ordine di riga risolve da sé le sovrapposizioni.
   */
  private disegnaTerreno() {
    const suolo = costruisciSuolo(this, this.mappa.length, (x, y) => {
      const terreno = terrenoSotto(x, y)
      if (terreno === 'acqua') {
        return { materiale: null, rialzo: 0, coloreCordolo: null, colore: 0x1e3f5c }
      }

      const q = quartiereIn(x, y)
      const strada = terreno === 'strada'
      const marciapiede = terreno === 'marciapiede'
      const rialzo = marciapiede
        ? q.pavimentazione === 'sterrato'
          ? 2
          : ALTEZZA_CORDOLO
        : 0

      return {
        materiale: strada
          ? materialeStrada(q.pavimentazione)
          : marciapiede
            ? materialeMarciapiede(q.pavimentazione)
            : 'erba',
        rialzo,
        coloreCordolo: marciapiede ? q.marciapiede : null,
        colore: strada ? q.strada : marciapiede ? q.marciapiede : q.suolo,
        mezzeria: strada ? mezzeriaIn(x, y) : undefined,
        strisce: strada ? strisceIn(x, y) : null,
      }
    })

    for (const pezzo of suolo) {
      const immagine = this.add.image(pezzo.x, pezzo.y, pezzo.chiave)
      immagine.setOrigin(0, 0)
      immagine.setDepth(-1000)
    }
  }

  /**
   * Le persone in città: gli sprite e l'ombra, pronti per essere mossi.
   *
   * Il giro di ciascuno lo decide `engine/npcMovimento.ts`; qui si crea solo
   * quello che serve a disegnarlo — la posizione la aggiorna `aggiornaNpc()`
   * a ogni frame, come per il giocatore.
   */
  private disegnaNpc() {
    for (const dati of NPC) {
      const personaggio = creaPersonaggio(this, dati.sprite, 0, 0)
      if (!personaggio) continue

      const ombra = disegnaOmbra(this, TILE_W * 0.4, 6)
      personaggio.sprite.setFrame(fotogrammaFermo(dati.verso))

      this.npcVivi.push({ dati, stato: statoInizialeNpc(dati), personaggio, ombra })
    }

    for (const vivo of this.npcVivi) this.posizionaNpc(vivo)
  }

  /** Fa avanzare il giro di ogni NPC e li ridisegna nella nuova posizione. */
  private aggiornaNpcVivi(deltaSec: number) {
    for (const vivo of this.npcVivi) {
      const stessa = vivo.stato
      vivo.stato = aggiornaNpc(vivo.dati, vivo.stato, this.mappa, deltaSec)

      if (vivo.stato.destinazione) {
        const dx = vivo.stato.destinazione.x - stessa.pos.x
        const dy = vivo.stato.destinazione.y - stessa.pos.y
        vivo.personaggio.aggiorna({ x: dx, y: dy }, true)
      } else if (stessa.destinazione) {
        // È appena arrivato: ferma l'animazione sull'ultima posa di marcia.
        vivo.personaggio.aggiorna({ x: 0, y: 0 }, false)
      }

      this.posizionaNpc(vivo)
    }
  }

  private posizionaNpc(vivo: NpcVivo) {
    const { sx, sy } = grigliaASchermo(vivo.stato.pos)
    const piedi = sy

    vivo.personaggio.sprite.setPosition(sx, piedi)
    vivo.personaggio.sprite.setDepth(profondita(vivo.stato.pos))

    vivo.ombra.setPosition(sx + DIREZIONE_OMBRA.x * 6, piedi + DIREZIONE_OMBRA.y * 6)
    vivo.ombra.setDepth(profondita(vivo.stato.pos) - 0.1)
  }

  /**
   * Gli alberi: quale varietà tocca a ogni cella è deciso una volta sola,
   * dalle coordinate — così la mappa non cambia aspetto a ogni ricarica pur
   * senza salvare nulla.
   */
  private disegnaAlberi() {
    for (let y = 0; y < this.mappa.length; y++) {
      for (let x = 0; x < this.mappa[y].length; x++) {
        if (this.mappa[y][x] !== 'albero') continue

        const tipo = ALBERI[Math.floor(varianteAlbero(x, y) * ALBERI.length)]
        const ancora = ancoraAlbero(tipo)

        const { sx, sy } = grigliaASchermo({ x, y })
        const albero = this.add.image(sx, sy, chiaveAlbero(tipo))
        albero.setOrigin(ancora.x, ancora.y)
        albero.setDepth(profondita({ x, y }))
      }
    }
  }

  private disegnaArredo() {
    for (const pezzo of ARREDO) {
      const { sx, sy } = grigliaASchermo(pezzo)
      const depth = profondita(pezzo)

      if (pezzo.tipo === 'lampione') {
        this.disegnaLampione(pezzo, sx, sy, depth)
        continue
      }

      if (pezzo.tipo === 'muro') {
        const muro = muroPer(pezzo.variante ?? 0)
        if (!muro) continue

        const img = this.add.image(sx, sy + TILE_H / 2, muro.chiave, muro.frame)
        img.setOrigin(0.5, 1)
        img.setScale(muro.scala)
        // Il disegno esiste in un verso solo: l'altro si ottiene specchiando.
        img.setFlipX(pezzo.specchiato ?? false)
        img.setDepth(depth)
        continue
      }

      // I pezzi con uno sprite dedicato: l'arredo di periferia.
      const sprite = pezzoPer(pezzo.tipo)
      if (sprite) {
        const img = this.add.image(sx, sy + TILE_H / 2, sprite.chiave, sprite.frame)
        img.setOrigin(0.5, 1)
        img.setScale(sprite.scala)
        img.setDepth(depth)

        const luce = LUMINOSI[pezzo.tipo]
        if (luce) this.aggiungiFuoco(sx, sy, depth, luce.raggio, luce.forza)
        continue
      }

      // Gli altri restano volumi piatti dai colori fissi.
      const stile = STILE_ARREDO[pezzo.tipo]
      if (!stile) continue

      const altezzaFacciata = pezzo.tipo === 'auto' ? 7 : pezzo.tipo === 'cassonetto' ? 8 : 4

      const chiave = texturaVolume(
        this,
        `arr-${pezzo.tipo}`,
        stile.larghezza,
        stile.profondita,
        altezzaFacciata,
        { tetto: stile.tetto, facciata: stile.facciata },
        { forma: stile.ellisse ? 'ellisse' : 'rettangolo' },
      )
      const ancora = ancoraVolume(stile.profondita, altezzaFacciata)

      const img = this.add.image(sx, sy + TILE_H / 2, chiave)
      img.setOrigin(ancora.x, ancora.y)
      img.setDepth(depth)
    }
  }

  private disegnaLampione(pezzo: Arredo, sx: number, sy: number, depth: number) {
    const img = this.add.image(sx, sy, texturaLampione(this))
    img.setDepth(depth)

    this.aggiungiFuoco(sx, sy, depth, 64, 0.55)
    void pezzo
  }

  /** L'alone caldo di un fuoco acceso, che di notte illumina il vicolo. */
  private aggiungiFuoco(
    sx: number,
    sy: number,
    depth: number,
    raggio: number,
    forza: number,
  ) {
    const alone = this.add.image(sx, sy - 14, texturaAlone(this, raggio))
    alone.setDepth(depth - 0.2)
    alone.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(alone, forza)

    const pozza = this.add.image(sx, sy + 4, texturaAlone(this, raggio))
    pozza.setScale(1.3, 0.6)
    pozza.setDepth(-999)
    pozza.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(pozza, forza * 0.7)
  }

  private disegnaLuoghi() {
    for (const luogo of LUOGHI) {
      this.disegnaEdificio(luogo)
      this.disegnaSoglia(luogo)
      this.disegnaInsegna(luogo)
    }
  }

  private disegnaEdificio(luogo: Luogo) {
    const { centroX, sud, depth } = this.rettangoloLuogo(luogo)

    const pezzo = disegnaLuogo(this, luogo)
    if (!pezzo) return

    const immagine = this.add.image(centroX, sud, pezzo.chiave)
    immagine.setOrigin(pezzo.ancora.x, pezzo.ancora.y)
    immagine.setDepth(depth)
  }

  /** Il rettangolo a schermo occupato da un luogo, e i punti utili a chi lo disegna. */
  private rettangoloLuogo(luogo: Luogo) {
    const x0 = luogo.origine.x
    const y0 = luogo.origine.y
    const x1 = x0 + luogo.larghezza - 1
    const y1 = y0 + luogo.profondita - 1

    const alto = grigliaASchermo({ x: x0, y: y0 })
    const basso = grigliaASchermo({ x: x1, y: y1 })

    const left = alto.sx - TILE_W / 2
    const top = alto.sy - TILE_H / 2
    const sud = basso.sy + TILE_H / 2
    const centroX = (left + (basso.sx + TILE_W / 2)) / 2

    return { left, top, sud, centroX, depth: profondita({ x: x1, y: y1 }) }
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
    const { top, centroX } = this.rettangoloLuogo(luogo)
    const sx = centroX
    const quotaInsegna = top - 20

    const testo = this.add.text(sx, quotaInsegna, luogo.nome.toUpperCase(), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#f8fafc',
      backgroundColor: coloreCss(COLORE_INSEGNA[luogo.tipo]),
      padding: { x: 8, y: 3 },
    })
    testo.setOrigin(0.5, 1)
    testo.setDepth(10_000)

    // Di notte l'insegna alona come un neon.
    const neon = this.add.rectangle(
      sx,
      quotaInsegna - testo.height / 2,
      testo.width + 16,
      testo.height + 12,
      COLORE_INSEGNA[luogo.tipo],
    )
    neon.setDepth(9_999)
    neon.setBlendMode(Phaser.BlendModes.ADD)
    this.luminosi.aggiungi(neon, 0.4)

    if (!luogo.accessibile && luogo.motivoChiusura) {
      const chiuso = this.add.text(sx, quotaInsegna + 16, luogo.motivoChiusura, {
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

  private impostaCamera() {
    const lato = this.mappa.length
    // Un po' di aria sopra il bordo nord, dove le facciate degli edifici e le
    // insegne sporgono oltre la prima riga di celle.
    const margine = 2 * TILE_H

    // Inquadratura più larga: da vicino si vedevano tre isolati e la griglia
    // delle strade non si leggeva, che è poi il senso di una vista dall'alto.
    this.cameras.main.setZoom(0.7)

    // La mappa parte dall'origine e si estende in basso a destra.
    this.cameras.main.setBounds(
      -TILE_W / 2,
      -TILE_H / 2 - margine,
      lato * TILE_W,
      lato * TILE_H + margine,
    )
    // Interpolazione leggera: incollata al giocatore, la camera ne copiava
    // anche gli arresti bruschi contro i muri. Ammortizzarli richiede un po' di
    // ritardo nell'inseguimento.
    //
    // In passato l'interpolazione faceva tremolare l'inquadratura, ma solo
    // perché combinata con l'arrotondamento al pixel: gli avvicinamenti
    // sub-pixel venivano arrotondati a valori alterni. Senza arrotondamento il
    // problema non si pone.
    this.cameras.main.startFollow(this.giocatore, false, 0.18, 0.18)
  }
}

function coloreCss(colore: number): string {
  return `#${colore.toString(16).padStart(6, '0')}`
}

/** Rumore deterministico tra 0 e 1, per scegliere la varietà di un albero. */
function varianteAlbero(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

