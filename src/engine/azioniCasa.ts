import type { Fame, GameState, Giocatore, Sonno } from './state'
import { FAME_PER_ORA } from './state'
import {
  CIBI,
  ciboPerId,
  conBonusDelPasto,
  prendiDalFrigo,
  quantoNeResta,
  type TipoCibo,
} from './cibo'
import { raffredda } from './polizia'
import { avanza } from './time'

/**
 * Cosa succede quando si dorme, si mangia o si mette via il contante.
 *
 * Funzioni pure che prendono lo stato e ne restituiscono uno nuovo: le regole
 * di cosa costa un'ora di sonno o un pasto si verificano coi test, senza
 * aprire il gioco. Lo store si limita a sostituire lo stato con quello che
 * torna da qui.
 */

/** Quante ore di sonno servono a notte per non accumulare debito. */
export const FABBISOGNO_SONNO = 7

/** Quanto dura un pasto, in ore di gioco: il conto è quello del brief. */
export const ORE_PASTO = 1

/**
 * Dormire.
 *
 * Il debito scende di quanto si dorme oltre il fabbisogno e sale se si dorme
 * meno: è cumulativo, quindi tre notti da quattro ore pesano come una notte in
 * bianco. Nel frattempo il tempo passa e la fame cresce — ci si sveglia
 * affamati, che è il punto.
 *
 * È anche il momento in cui il bazar riapre il credito: il tetto giornaliero
 * si azzera solo tornando a casa a dormire, mai stando in giro.
 */
export function dormi(stato: GameState, ore: number): GameState {
  const dormite = Math.max(0, ore)

  const sonno: Sonno = {
    debito: Math.max(0, stato.sonno.debito - (dormite - FABBISOGNO_SONNO)),
  }

  return raffredda(
    {
      ...stato,
      sonno,
      fame: cresceLaFame(stato.fame, dormite),
      tempo: avanza(stato.tempo, dormite),
      mercato: { ...stato.mercato, grammiPresiOggi: 0 },
    },
    dormite,
  )
}

/**
 * Mangiare: sazia, costa un'ora, e non toglie il sonno arretrato.
 *
 * Senza dire cosa si prende quello che capita, cioè il primo cibo che c'è in
 * frigo. Col frigo vuoto non succede niente: è il frigo a dire che bisogna
 * passare dal negozio.
 */
export function mangia(stato: GameState, cibo?: TipoCibo): GameState {
  const scelto = cibo ?? CIBI.find((c) => quantoNeResta(stato, c.id) > 0)?.id
  if (!scelto) return stato

  const dopoIlFrigo = prendiDalFrigo(stato, scelto)
  if (!dopoIlFrigo) return stato

  const { sazieta } = ciboPerId(scelto)

  return {
    ...dopoIlFrigo,
    giocatore: {
      ...dopoIlFrigo.giocatore,
      statistiche: conBonusDelPasto(dopoIlFrigo.giocatore.statistiche, scelto),
    },
    fame: { livello: arrotonda(Math.max(0, stato.fame.livello - sazieta)) },
    tempo: avanza(stato.tempo, ORE_PASTO),
  }
}

/**
 * Mettere via il contante in casa.
 *
 * Quello che si nasconde non si ha più addosso: è l'unica cosa che un arresto
 * non porta via, almeno finché non arriveranno i nascondigli in giro per la
 * città e la casa smetterà di essere sicura.
 */
export function nascondiSoldi(stato: GameState, importo: number): GameState {
  const nascosti = Math.min(
    Math.max(0, Math.floor(importo)),
    Math.floor(stato.giocatore.contante),
  )
  if (nascosti === 0) return stato

  const giocatore: Giocatore = {
    ...stato.giocatore,
    contante: stato.giocatore.contante - nascosti,
    soldiNascosti: stato.giocatore.soldiNascosti + nascosti,
  }

  return { ...stato, giocatore }
}

/** Riprendere il contante dal nascondiglio: torna in tasca, e in tasca si perde. */
export function riprendiSoldi(stato: GameState, importo: number): GameState {
  const preso = Math.min(
    Math.max(0, Math.floor(importo)),
    stato.giocatore.soldiNascosti,
  )
  if (preso === 0) return stato

  return {
    ...stato,
    giocatore: {
      ...stato.giocatore,
      soldiNascosti: stato.giocatore.soldiNascosti - preso,
      contante: stato.giocatore.contante + preso,
    },
  }
}

/** Quanto contante si ha addosso, ed è quindi nascondibile. */
export function contanteAddosso(stato: GameState): number {
  return stato.giocatore.contante
}

export function cresceLaFame(fame: Fame, ore: number): Fame {
  return { livello: arrotonda(Math.min(100, fame.livello + ore * FAME_PER_ORA)) }
}

/** Due decimali bastano: la fame si mostra come percentuale intera. */
function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
