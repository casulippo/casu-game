import type { GameState } from './state'
import { NPC } from './npc'
import { quartiereIn } from './quartieri'

/**
 * Quello che la città si ricorda di te.
 *
 * Serve a una cosa sola, ma centrale: rendere vero il prezzo della violenza.
 * Il malus del 30% sui clienti dice che sparare in giro costa; la memoria dice
 * chi se n'è accorto, per quanto tempo, e chi l'ha saputo da altri.
 *
 * Il peso di ogni ricordo decade una volta per notte, quando si dorme: una
 * passata sull'elenco, non un conto in tempo reale.
 */

export type TipoEvento = 'spinta' | 'pestaggio' | 'sparato' | 'salvato'

export interface Ricordo {
  npcId: string
  evento: TipoEvento
  peso: number
  pesoIniziale: number
  giorno: number
  /** Chi ha visto ricorda meglio di chi l'ha sentito dire. */
  testimoneDiretto: boolean
}

/** Quanto pesa un fatto appena successo. */
export const PESO: Record<TipoEvento, number> = {
  spinta: 40,
  pestaggio: 70,
  sparato: 95,
  salvato: 80,
}

/** Quanto di quel peso resta dopo una notte. */
const DECADIMENTO: Record<TipoEvento, number> = {
  spinta: 0.97,
  pestaggio: 0.99,
  // Una sparatoria non si dimentica quasi mai: resta sempre un fondo.
  sparato: 0.998,
  salvato: 1,
}

/** Quello che si è sentito dire svanisce in fretta. */
const DECADIMENTO_SENTITO = 0.94

/** Sotto questo peso un ricordo è svanito e si butta via. */
const SOGLIA_OBLIO = 1

export function eNegativo(evento: TipoEvento): boolean {
  return evento !== 'salvato'
}

/** Segnare un fatto nella memoria di un NPC. */
export function ricorda(
  stato: GameState,
  npcId: string,
  evento: TipoEvento,
  testimoneDiretto = true,
): GameState {
  const peso = testimoneDiretto ? PESO[evento] : PESO[evento] / 2

  return {
    ...stato,
    ricordi: [
      ...stato.ricordi,
      {
        npcId,
        evento,
        peso,
        pesoIniziale: peso,
        giorno: stato.tempo.giorno,
        testimoneDiretto,
      },
    ],
  }
}

/**
 * Chi ha visto.
 *
 * Un fatto in strada lo registrano gli NPC che stanno in quel quartiere: non
 * c'è bisogno di simulare linee di vista per capire che sparare sotto casa
 * propria è peggio che sparare dall'altra parte della città.
 */
export function testimoniInZona(stato: GameState): string[] {
  return NPC.filter((n) => quartiereIn(n.x, n.y).id === stato.quartiereCorrente).map(
    (n) => n.id,
  )
}

/** Segnare un fatto a carico di tutti quelli che stavano lì. */
export function hannoVisto(
  stato: GameState,
  evento: TipoEvento,
): GameState {
  return testimoniInZona(stato).reduce((s, id) => ricorda(s, id, evento), stato)
}

/**
 * Come ti guarda un NPC.
 *
 * Sopra zero è credito, sotto è debito: si somma quello che gli hai fatto, col
 * peso che gli è rimasto oggi.
 */
export function atteggiamento(stato: GameState, npcId: string): number {
  return stato.ricordi
    .filter((r) => r.npcId === npcId)
    .reduce((somma, r) => somma + (eNegativo(r.evento) ? -r.peso : r.peso), 0)
}

export type Comportamento = 'evita' | 'freddo' | 'cauto' | 'normale' | 'amico'

export function comportamento(stato: GameState, npcId: string): Comportamento {
  const punteggio = atteggiamento(stato, npcId)

  if (punteggio <= -70) return 'evita'
  if (punteggio <= -30) return 'freddo'
  if (punteggio < -10) return 'cauto'
  return punteggio > 30 ? 'amico' : 'normale'
}

/**
 * Una notte di decadimento.
 *
 * I ricordi ormai svaniti si buttano: tenerli a peso zero vorrebbe dire far
 * crescere l'elenco per sempre senza che nessuno se ne accorga.
 */
export function decadi(ricordi: Ricordo[]): Ricordo[] {
  return ricordi
    .map((r) => ({
      ...r,
      peso: arrotonda(
        r.peso * (r.testimoneDiretto ? DECADIMENTO[r.evento] : DECADIMENTO_SENTITO),
      ),
    }))
    .filter((r) => r.peso >= SOGLIA_OBLIO)
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
