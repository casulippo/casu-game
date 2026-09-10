import type { GameState, Statistiche } from './state'

/**
 * Il cibo e il frigo.
 *
 * Mangiare non serve solo a non morire di fame: mangiare bene rimette in sesto
 * e alza le statistiche, mangiare schifezze riempie e basta. È la differenza
 * fra il panino del distributore e la carne comprata al supermercato.
 *
 * Il frigo va riempito quando si passa dal negozio: tornare a casa e trovarlo
 * vuoto è parte del gioco.
 */

export type TipoCibo = 'panino' | 'pasta' | 'carne' | 'verdura' | 'integratori'

export interface DatiCibo {
  id: TipoCibo
  nome: string
  prezzo: number
  /** Di quanto abbassa la fame, su una scala da 0 a 100. */
  sazieta: number
  /** Quanto rimette in sesto, una volta mangiato. */
  bonus: Partial<Statistiche>
}

export const CIBI: DatiCibo[] = [
  { id: 'panino', nome: 'Panino', prezzo: 3, sazieta: 25, bonus: {} },
  { id: 'pasta', nome: 'Pasta', prezzo: 5, sazieta: 45, bonus: { vita: 3 } },
  { id: 'carne', nome: 'Carne', prezzo: 9, sazieta: 55, bonus: { vita: 6 } },
  { id: 'verdura', nome: 'Verdura', prezzo: 6, sazieta: 30, bonus: { vita: 4, bellezza: 2 } },
  {
    id: 'integratori',
    nome: 'Integratori',
    prezzo: 14,
    sazieta: 10,
    bonus: { mira: 3, bellezza: 3 },
  },
]

/** Il tetto di ogni statistica: si cresce mangiando, ma non all'infinito. */
export const MASSIMO_STATISTICA = 100

export function ciboPerId(id: TipoCibo): DatiCibo {
  const trovato = CIBI.find((c) => c.id === id)
  if (!trovato) throw new Error(`Cibo sconosciuto: ${id}`)
  return trovato
}

export function quantoNeResta(stato: GameState, cibo: TipoCibo): number {
  return stato.frigo[cibo] ?? 0
}

/** Quanta roba da mangiare c'è in casa, in tutto. */
export function frigoPieno(stato: GameState): number {
  return CIBI.reduce((somma, c) => somma + quantoNeResta(stato, c.id), 0)
}

export interface Spesa {
  stato: GameState
  /** Quante porzioni si è riusciti a comprare: il contante può tagliare corto. */
  quantita: number
  spesa: number
}

/** Fare la spesa: quello che si compra finisce nel frigo, non in tasca. */
export function compraCibo(
  stato: GameState,
  cibo: TipoCibo,
  quantita: number,
): Spesa {
  const prezzo = ciboPerId(cibo).prezzo
  const volute = Math.max(0, Math.floor(quantita))
  const prese = Math.min(volute, Math.floor(stato.giocatore.contante / prezzo))

  if (prese === 0) return { stato, quantita: 0, spesa: 0 }

  return {
    stato: {
      ...stato,
      giocatore: { ...stato.giocatore, contante: stato.giocatore.contante - prese * prezzo },
      frigo: { ...stato.frigo, [cibo]: quantoNeResta(stato, cibo) + prese },
    },
    quantita: prese,
    spesa: prese * prezzo,
  }
}

/**
 * Consumare una porzione dal frigo.
 *
 * Torna lo stato invariato se quel cibo è finito: è il frigo vuoto a dire che
 * bisogna passare dal negozio, non un messaggio d'errore.
 */
export function prendiDalFrigo(stato: GameState, cibo: TipoCibo): GameState | null {
  const rimaste = quantoNeResta(stato, cibo)
  if (rimaste <= 0) return null

  const frigo = { ...stato.frigo, [cibo]: rimaste - 1 }
  if (rimaste - 1 === 0) delete frigo[cibo]

  return { ...stato, frigo }
}

/** I bonus di un pasto, applicati alle statistiche base e con il loro tetto. */
export function conBonusDelPasto(
  statistiche: Statistiche,
  cibo: TipoCibo,
): Statistiche {
  const { bonus } = ciboPerId(cibo)
  const somma = (valore: number, aggiunta = 0) =>
    Math.min(MASSIMO_STATISTICA, arrotonda(valore + aggiunta))

  return {
    mira: somma(statistiche.mira, bonus.mira),
    vita: somma(statistiche.vita, bonus.vita),
    socialita: somma(statistiche.socialita, bonus.socialita),
    bellezza: somma(statistiche.bellezza, bonus.bellezza),
  }
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}
