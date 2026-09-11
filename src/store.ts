import { create } from 'zustand'
import type { Griglia } from './engine/iso'
import {
  statoIniziale,
  type Droga,
  type GameState,
  type Quartiere,
} from './engine/state'
import type { IdParco } from './engine/city'
import { avanza } from './engine/time'
import { stessaInterazione, type Interazione } from './engine/interazione'
import {
  cresceLaFame,
  dormi,
  mangia,
  nascondiSoldi,
  riprendiSoldi,
} from './engine/azioniCasa'
import { acquistaAlBazar } from './engine/droga'
import {
  acquistaDallaMafia,
  compraArma,
  compraStrumento,
  impugna,
  parlaConLaMafia,
} from './engine/negozi'
import { compraCibo, type TipoCibo } from './engine/cibo'
import type { TipoArma } from './engine/armi'
import type { TipoStrumento } from './engine/strumenti'
import {
  apriLaStrada,
  combatti,
  forseUnRaid,
  raffredda,
  vistiVendere,
} from './engine/polizia'
import { aggiornaFolla } from './engine/folla'
import { vendi } from './engine/spaccio'
import {
  affidaMetaDella,
  assumi,
  avanzaSpaccini,
  ritira,
  venditaAiRagazzini,
} from './engine/spaccini'
import { haParlatoCon, haVisto } from './engine/primiPassi'
import {
  nascondiContante,
  nascondiRoba,
  riprendiContante,
  riprendiRoba,
} from './engine/nascondigli'
import {
  compraLOffertaDelBazar,
  controlla,
  forsePrimoRaid,
  parchettoRipulito,
  scontroDelParchetto,
  visitaLArmeria,
} from './engine/storia'
import type { Comandi } from './engine/combattimento'

/** La chiave con cui il browser si ricorda che le istruzioni sono già state lette. */
const CHIAVE_INTRO = 'spaccio-city:intro-vista'

/**
 * Il browser può negare l'accesso alla memoria locale — finestra anonima,
 * impostazioni severe — e in quel caso le istruzioni si rivedono. È il male
 * minore: molto meglio di una pagina che non si apre.
 */
function giaVista(): boolean {
  try {
    return localStorage.getItem(CHIAVE_INTRO) === 'si'
  } catch {
    return false
  }
}

function ricordaCheLHaVista() {
  try {
    localStorage.setItem(CHIAVE_INTRO, 'si')
  } catch {
    // Pazienza: le rivedrà la prossima volta.
  }
}

/** Dove si trova il giocatore: per strada, o dentro un luogo. */
export type Ambiente = 'citta' | 'interno'

/**
 * L'unico ponte tra la logica di gioco, il canvas Phaser e la UI React.
 *
 * Phaser scrive qui (il tempo che scorre, dove si trova il giocatore),
 * React si sottoscrive e si ridisegna da solo. I due strati non si parlano
 * mai direttamente: è l'equivalente tipizzato dei signal di Godot.
 *
 * Qui non ci sono regole di gioco: ogni azione chiama una funzione di
 * `engine/` e mette a posto lo stato con quello che torna.
 */
interface GameStore extends GameState {
  ambiente: Ambiente
  /** Il luogo in cui si è entrati, se siamo dentro. */
  luogoCorrente: string | null
  /**
   * L'azione disponibile da dove si trova il giocatore.
   *
   * Aggiornata dalla scena solo quando cambia davvero, non a ogni frame:
   * ogni scrittura qui fa ri-renderizzare la UI.
   */
  interazione: Interazione
  /**
   * In che parchetto si è, se si è in un parchetto.
   *
   * Lo sa solo la scena, che ha la mappa sotto i piedi. Serve a due cose: le
   * vendite ai ragazzini valgono in qualunque parchetto, il primo scontro
   * della storia solo in quello delle bandelle.
   */
  parcoCorrente: IdParco | null
  /** La cella su cui sta il giocatore, aggiornata solo quando cambia davvero. */
  cella: Griglia
  /** La pianta della città è aperta? */
  mappaAperta: boolean
  /**
   * Le istruzioni sono a schermo?
   *
   * Si aprono da sole la prima volta e mai più: chi ha già giocato non deve
   * saltarle a ogni partita. La memoria sta nel browser, non nel salvataggio.
   */
  introAperta: boolean

  avanzaTempo: (oreGioco: number) => void
  vaiA: (quartiere: Quartiere) => void
  entraIn: (luogoId: string) => void
  esci: () => void
  segnalaInterazione: (interazione: Interazione) => void
  segnalaParco: (parco: IdParco | null) => void
  segnalaCella: (cella: Griglia) => void
  alternaMappa: () => void
  chiudiIntro: () => void
  apriIntro: () => void

  /** Le azioni di casa: le regole stanno in `engine/azioniCasa.ts`. */
  dormi: (ore: number) => void
  mangia: (cibo?: TipoCibo) => void
  nascondi: (importo: number) => void
  riprendi: (importo: number) => void

  /** Il giro: vendere per strada e rifornirsi ai banconi. */
  vendi: (droga: Droga, aiRagazzini?: boolean) => void
  compraRoba: (droga: Droga, grammi: number) => void
  compraLOfferta: () => void
  compraArma: (arma: TipoArma) => void
  impugna: (arma: TipoArma) => void
  compraStrumento: (id: TipoStrumento) => void
  /** La roba pesante: si compra solo se l'uomo in grigio ti considera. */
  compraDallaMafia: (droga: Droga, grammi: number) => void
  compraCibo: (cibo: TipoCibo, quantita: number) => void
  ritiraDa: (spaccinoId: string) => void
  assumiSpaccino: () => void
  affidaMeta: (spaccinoId: string, droga: Droga) => void
  parlaCon: (npcId: string) => void
  /** I nascondigli in giro: l'unica cosa che un arresto non porta via. */
  depositaContante: (nascondiglio: string, importo: number) => void
  ritiraContante: (nascondiglio: string, importo: number) => void
  depositaRoba: (nascondiglio: string, droga: Droga, grammi: number) => void
  ritiraRoba: (nascondiglio: string, droga: Droga, grammi: number) => void
  visitaArmeria: () => void

  /** Quello che chiama la scena a ogni frame. */
  combatti: (dt: number, comandi: Comandi) => void
  /** Apre la città: il campo in cui camminano i passanti e volano i colpi. */
  apriLaStrada: (posizione: Griglia) => void
  /** Fa nascere e sparire la gente attorno al giocatore. */
  ricambiaLaFolla: (
    dt: number,
    posizione: Griglia,
    calpestabile: (x: number, y: number) => boolean,
  ) => void
  /** Un minuto di gioco passato: è il momento in cui può partire un raid. */
  unMinuto: (posizione: Griglia) => void
  ripulisciIlParchetto: (posizione: Griglia) => void

  reset: () => void
  carica: (stato: GameState) => void
}

export const useGame = create<GameStore>()((set) => ({
  ...statoIniziale(),
  ambiente: 'citta',
  luogoCorrente: null,
  interazione: null,
  parcoCorrente: null,
  cella: { x: 0, y: 0 },
  mappaAperta: false,
  introAperta: !giaVista(),

  avanzaTempo: (oreGioco) =>
    set((s) =>
      raffredda(
        avanzaSpaccini(
          { ...s, tempo: avanza(s.tempo, oreGioco), fame: cresceLaFame(s.fame, oreGioco) },
          oreGioco,
        ),
        oreGioco,
      ),
    ),

  vaiA: (quartiere) => set((s) => haVisto({ ...s, quartiereCorrente: quartiere }, quartiere)),

  entraIn: (luogoId) =>
    set({ ambiente: 'interno', luogoCorrente: luogoId, interazione: null }),

  esci: () => set({ ambiente: 'citta', luogoCorrente: null, interazione: null }),

  segnalaInterazione: (interazione) =>
    set((s) =>
      stessaInterazione(s.interazione, interazione) ? s : { interazione },
    ),

  segnalaParco: (parcoCorrente) =>
    set((s) => (s.parcoCorrente === parcoCorrente ? s : { parcoCorrente })),

  segnalaCella: (cella) =>
    set((s) =>
      s.cella.x === cella.x && s.cella.y === cella.y ? s : { cella },
    ),

  alternaMappa: () => set((s) => ({ mappaAperta: !s.mappaAperta })),

  chiudiIntro: () => {
    ricordaCheLHaVista()
    set({ introAperta: false })
  },
  apriIntro: () => set({ introAperta: true }),

  dormi: (ore) => set((s) => dormi(s, ore)),
  mangia: (cibo) => set((s) => mangia(s, cibo)),
  nascondi: (importo) => set((s) => nascondiSoldi(s, importo)),
  riprendi: (importo) => set((s) => riprendiSoldi(s, importo)),

  /**
   * Vendere al prossimo passante.
   *
   * Il tiro di dado nasce qui e non dentro l'engine: le regole restano pure e
   * verificabili, il caso sta nello strato che le usa.
   */
  vendi: (droga, aiRagazzini = false) =>
    set((s) => {
      const esito = vendi(s, s.quartiereCorrente, droga, Math.random())
      if (!esito.venduto) return s

      const visto = vistiVendere(esito.stato, esito.rischio, Math.random())
      return controlla(aiRagazzini ? venditaAiRagazzini(visto) : visto)
    }),

  compraRoba: (droga, grammi) => set((s) => acquistaAlBazar(s, droga, grammi).stato),
  compraLOfferta: () => set((s) => compraLOffertaDelBazar(s)),
  compraArma: (arma) => set((s) => compraArma(s, arma).stato),
  impugna: (arma) => set((s) => impugna(s, arma)),
  compraStrumento: (id) => set((s) => compraStrumento(s, id).stato),
  compraDallaMafia: (droga, grammi) => set((s) => acquistaDallaMafia(s, droga, grammi).stato),
  compraCibo: (cibo, quantita) => set((s) => compraCibo(s, cibo, quantita).stato),
  ritiraDa: (spaccinoId) => set((s) => ritira(s, spaccinoId)),

  /** Il ragazzino si mette a vendere dove lo si è incontrato. */
  assumiSpaccino: () =>
    set((s) =>
      assumi(s, {
        id: `spaccino-${s.cella.x}-${s.cella.y}`,
        nome: 'Ragazzino',
        quartiere: s.quartiereCorrente,
        cella: s.cella,
      }),
    ),

  affidaMeta: (spaccinoId, droga) => set((s) => affidaMetaDella(s, spaccinoId, droga)),
  /**
   * Parlare con qualcuno.
   *
   * Con l'uomo in grigio non è solo un saluto: se hai girato abbastanza soldi,
   * da lì in poi il mercato nero tira fuori anche la roba pesante.
   */
  parlaCon: (npcId) =>
    set((s) => {
      const dopo = haParlatoCon(s, npcId)
      return npcId === 'mafia' ? parlaConLaMafia(dopo) : dopo
    }),

  depositaContante: (nascondiglio, importo) =>
    set((s) => nascondiContante(s, nascondiglio, importo)),
  ritiraContante: (nascondiglio, importo) =>
    set((s) => riprendiContante(s, nascondiglio, importo)),
  depositaRoba: (nascondiglio, droga, grammi) =>
    set((s) => nascondiRoba(s, nascondiglio, droga, grammi)),
  ritiraRoba: (nascondiglio, droga, grammi) =>
    set((s) => riprendiRoba(s, nascondiglio, droga, grammi)),
  visitaArmeria: () => set((s) => visitaLArmeria(s)),

  /**
   * Un passo di scontro.
   *
   * Se lo scontro finisce proprio adesso ed era quello del parchetto, è qui che
   * arriva il vecchietto con la pistola.
   */
  combatti: (dt, comandi) =>
    set((s) => {
      const dopo = combatti(s, dt, comandi)
      return !dopo.scontro && s.scontro?.esito === 'in-corso'
        ? parchettoRipulito(dopo)
        : dopo
    }),

  apriLaStrada: (posizione) => set((s) => apriLaStrada(s, posizione)),

  ricambiaLaFolla: (dt, posizione, calpestabile) =>
    set((s) =>
      s.scontro
        ? {
            scontro: aggiornaFolla(s.scontro, {
              dt,
              quartiere: s.quartiereCorrente,
              posGiocatore: posizione,
              calpestabile,
              caso: Math.random,
            }),
          }
        : s,
    ),

  unMinuto: (posizione) =>
    set((s) => forsePrimoRaid(forseUnRaid(s, posizione, Math.random()), posizione)),

  ripulisciIlParchetto: (posizione) => set((s) => scontroDelParchetto(s, posizione)),

  reset: () =>
    set({
      ...statoIniziale(),
      ambiente: 'citta',
      luogoCorrente: null,
      interazione: null,
    }),

  carica: (stato) => set(stato),
}))

/** Accesso allo stato fuori da React, per Phaser. */
export const gameStore = useGame

/**
 * Il gioco è fermo?
 *
 * Leggere le istruzioni o studiare la mappa non deve costare ore di gioco né
 * lasciarti addosso un raid che non hai visto arrivare.
 */
export function inPausa(stato: GameStore): boolean {
  return stato.introAperta || stato.mappaAperta
}

/**
 * In sviluppo lo store finisce anche su `window.gioco`.
 *
 * Serve a guardare lo stato dalla console del browser — e a farlo guardare a
 * chi sta debuggando da fuori — senza aggiungere pulsanti finti alla UI.
 */
if (import.meta.env.DEV) {
  ;(window as unknown as { gioco: typeof useGame }).gioco = useGame
}