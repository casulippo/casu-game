import type { GameState, Quartiere } from './state'
import { livelloPer } from './livello'

/**
 * I primi passi.
 *
 * Il livello si guadagna incassando, ma la prima parte della scala è una
 * barriera stupida: chi comincia non ha né roba né soldi, e senza livello 3 non
 * può assumere nessuno né tenere più di due nascondigli.
 *
 * Così esiste una seconda strada, che si percorre giocando invece che
 * guadagnando: fare un pasto, dormirci sopra, parlare con qualcuno in città e
 * mettere il naso in due quartieri diversi. Sono le quattro cose che insegnano
 * il gioco, e chi le ha fatte tutte si ritrova al livello 3.
 */

export interface PrimiPassi {
  mangiato: boolean
  dormito: boolean
  /** Con chi si è parlato: bastano gli id, non serve ricordare cosa si è detto. */
  parlatoCon: string[]
  quartieriVisti: Quartiere[]
}

/** Quanti quartieri diversi bisogna aver visto. */
export const QUARTIERI_DA_VEDERE = 2

/** Dove portano i primi passi, una volta fatti tutti. */
export const LIVELLO_DEI_PRIMI_PASSI = 3

export function primiPassiFatti(passi: PrimiPassi): boolean {
  return (
    passi.mangiato &&
    passi.dormito &&
    passi.parlatoCon.length > 0 &&
    passi.quartieriVisti.length >= QUARTIERI_DA_VEDERE
  )
}

/** Cosa manca ancora, in parole. Vuoto quando è tutto fatto. */
export function cosaManca(passi: PrimiPassi): string[] {
  const manca: string[] = []

  if (!passi.mangiato) manca.push('Mangia qualcosa')
  if (!passi.dormito) manca.push('Fatti una dormita')
  if (passi.parlatoCon.length === 0) manca.push('Parla con qualcuno')

  const quartieri = QUARTIERI_DA_VEDERE - passi.quartieriVisti.length
  if (quartieri > 0) {
    manca.push(quartieri === 1 ? 'Vedi un altro quartiere' : 'Gira due quartieri')
  }

  return manca
}

/**
 * Il livello che spetta adesso.
 *
 * Le due strade non si sommano: vale la più avanti delle due. Chi arriva al 3
 * incassando non lo perde se non ha ancora dormito, e chi ci arriva coi primi
 * passi continua a salire normalmente da lì.
 */
export function livelloDi(stato: GameState): number {
  const perSoldi = livelloPer(stato.giocatore.incassoTotale)
  const perPassi = primiPassiFatti(stato.primiPassi) ? LIVELLO_DEI_PRIMI_PASSI : 1

  return Math.max(perSoldi, perPassi)
}

/** Rimette a posto il livello dopo qualunque cosa possa averlo mosso. */
export function conLivelloAggiornato(stato: GameState): GameState {
  const livello = livelloDi(stato)
  if (livello === stato.giocatore.livello) return stato

  return { ...stato, giocatore: { ...stato.giocatore, livello } }
}

export function haMangiato(stato: GameState): GameState {
  if (stato.primiPassi.mangiato) return stato
  return conLivelloAggiornato({
    ...stato,
    primiPassi: { ...stato.primiPassi, mangiato: true },
  })
}

export function haDormito(stato: GameState): GameState {
  if (stato.primiPassi.dormito) return stato
  return conLivelloAggiornato({
    ...stato,
    primiPassi: { ...stato.primiPassi, dormito: true },
  })
}

export function haParlatoCon(stato: GameState, npcId: string): GameState {
  if (stato.primiPassi.parlatoCon.includes(npcId)) return stato

  return conLivelloAggiornato({
    ...stato,
    primiPassi: {
      ...stato.primiPassi,
      parlatoCon: [...stato.primiPassi.parlatoCon, npcId],
    },
  })
}

/** Mettere piede in un quartiere. Quello di partenza conta come primo. */
export function haVisto(stato: GameState, quartiere: Quartiere): GameState {
  if (stato.primiPassi.quartieriVisti.includes(quartiere)) return stato

  return conLivelloAggiornato({
    ...stato,
    primiPassi: {
      ...stato.primiPassi,
      quartieriVisti: [...stato.primiPassi.quartieriVisti, quartiere],
    },
  })
}
