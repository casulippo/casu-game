import { create } from 'zustand'
import type { Griglia } from './engine/iso'
import {
  statoIniziale,
  type Droga,
  type GameState,
  type Quartiere,
} from './engine/state'
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
import { compraArma, compraStrumento, impugna } from './engine/negozi'
import { compraCibo, type TipoCibo } from './engine/cibo'
import type { TipoArma } from './engine/armi'
import type { TipoStrumento } from './engine/strumenti'
import { combatti, forseUnRaid, raffredda, vistiVendere } from './engine/polizia'
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
  compraLOffertaDelBazar,
  controlla,
  forsePrimoRaid,
  parchettoRipulito,
  scontroDelParchetto,
  visitaLArmeria,
} from './engine/storia'
import type { Comandi } from './engine/combattimento'

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
   * Si è fermi in un parchetto?
   *
   * Lo sa solo la scena, che ha la mappa sotto i piedi, e serve alla UI per
   * sapere se una vendita è fatta ai ragazzini.
   */
  nelParchetto: boolean
  /** La cella su cui sta il giocatore, aggiornata solo quando cambia davvero. */
  cella: Griglia

  avanzaTempo: (oreGioco: number) => void
  vaiA: (quartiere: Quartiere) => void
  entraIn: (luogoId: string) => void
  esci: () => void
  segnalaInterazione: (interazione: Interazione) => void
  segnalaParchetto: (nelParchetto: boolean) => void
  segnalaCella: (cella: Griglia) => void

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
  compraCibo: (cibo: TipoCibo, quantita: number) => void
  ritiraDa: (spaccinoId: string) => void
  assumiSpaccino: () => void
  affidaMeta: (spaccinoId: string, droga: Droga) => void
  parlaCon: (npcId: string) => void
  visitaArmeria: () => void

  /** Quello che chiama la scena a ogni frame. */
  combatti: (dt: number, comandi: Comandi) => void
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
  nelParchetto: false,
  cella: { x: 0, y: 0 },

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

  segnalaParchetto: (nelParchetto) =>
    set((s) => (s.nelParchetto === nelParchetto ? s : { nelParchetto })),

  segnalaCella: (cella) =>
    set((s) =>
      s.cella.x === cella.x && s.cella.y === cella.y ? s : { cella },
    ),

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
  parlaCon: (npcId) => set((s) => haParlatoCon(s, npcId)),
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
