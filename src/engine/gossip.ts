import type { GameState } from './state'
import { RELAZIONI, type Relazione } from './npc'
import { decadi, type Ricordo } from './memoria'

/**
 * Il passaparola.
 *
 * A fine giornata chi ha visto qualcosa lo racconta a chi si fida abbastanza di
 * lui. Il ricordo di seconda mano nasce già dimezzato e svanisce in fretta: è
 * quello che fa arrivare la fama di una sparatoria nel quartiere accanto senza
 * che nessuno l'abbia vista.
 */

/** Sotto questa fiducia non ci si racconta niente. */
const FIDUCIA_MINIMA = 0.3

/** Quanto arriva di un racconto di seconda mano. */
const QUANTO_PASSA = 0.5

export function propaga(
  ricordi: Ricordo[],
  oggi: number,
  relazioni: Relazione[] = RELAZIONI,
): Ricordo[] {
  const diOggi = ricordi.filter((r) => r.giorno === oggi && r.testimoneDiretto)

  const passaparola = diOggi.flatMap((ricordo) =>
    relazioni
      .filter((rel) => rel.a === ricordo.npcId && rel.forza >= FIDUCIA_MINIMA)
      .filter(
        (rel) =>
          // Chi c'era già lo sa, e meglio di come glielo racconterebbero.
          !ricordi.some(
            (r) => r.npcId === rel.b && r.evento === ricordo.evento && r.giorno === oggi,
          ),
      )
      .map<Ricordo>((rel) => ({
        ...ricordo,
        npcId: rel.b,
        peso: arrotonda(ricordo.peso * rel.forza * QUANTO_PASSA),
        testimoneDiretto: false,
      })),
  )

  return [...ricordi, ...passaparola]
}

/**
 * La notte del mondo vivo.
 *
 * Prima si racconta, poi si dimentica: chi ha saputo qualcosa oggi comincia a
 * dimenticarlo da domani, non nella stessa notte in cui l'ha sentito.
 */
export function laNotteChePassa(stato: GameState): GameState {
  return { ...stato, ricordi: decadi(propaga(stato.ricordi, stato.tempo.giorno)) }
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
