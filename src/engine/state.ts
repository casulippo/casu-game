/**
 * Il modello dati del gioco.
 *
 * Regola fondamentale: questo file, e tutto il resto di `engine/`, non conosce
 * il DOM né il canvas. Sono tipi e funzioni pure, testabili senza aprire il gioco.
 */

export type Quartiere =
  /** I palazzoni dove si abita, e il bazar del Tridente dietro le case a schiera. */
  | 'palazzoni'
  /** Le bandelle di quartiere, il parchetto, l'armeria del vecchietto. */
  | 'bandelle'
  /** Centro storico: soldi e polizia. */
  | 'centro'
  /** Le case dei ricchi. Si vende bene, si rischia molto. */
  | 'residenziale'
  /** Locali e vita notturna. */
  | 'notturna'
  /** Il quartiere della mafia, con il mercato nero degli strumenti. */
  | 'mafia'

export type Droga = 'marijuana' | 'md' | 'lsd' | 'cocaina' | 'crack' | 'eroina'

/** Quanti grammi si hanno di ogni tipo di roba. */
export type Inventario = Partial<Record<Droga, number>>

/**
 * Le quattro statistiche.
 *
 * Non servono solo a sparare: socialità e bellezza pesano sulla storia e su
 * quanto facilmente un cliente si fida.
 */
export interface Statistiche {
  mira: number
  vita: number
  socialita: number
  bellezza: number
}

export interface Giocatore {
  nome: string
  /** Il contante addosso: è questo che si perde con un arresto o una sconfitta. */
  contante: number
  /**
   * Il contante messo via in casa.
   *
   * Provvisorio: quando arriveranno i nascondigli in giro per la città sarà
   * quello il posto sicuro, e la casa tornerà a essere perquisibile come il resto.
   */
  soldiNascosti: number
  /**
   * Quanto si è incassato dall'inizio della partita.
   *
   * Non scende mai: il livello è una soglia raggiunta, non un saldo. Chi arriva
   * a 100 € e poi si fa arrestare resta di livello 2.
   */
  incassoTotale: number
  livello: number
  statistiche: Statistiche
  /** Quanto la polizia ti sta addosso, 0-4. È questo a far partire i raid. */
  livelloRicerca: 0 | 1 | 2 | 3 | 4
  roba: Inventario
}

/** Il tempo di gioco. Un giorno di vita del personaggio = 60 minuti reali. */
export interface Tempo {
  /** Giorni trascorsi dall'inizio della partita. */
  giorno: number
  /** Ora del giorno, 0-23. */
  ora: number
  /** Minuti dell'ora corrente, 0-59. */
  minuto: number
}

/**
 * Debito di sonno accumulato. Cumulativo: tre notti da 4 ore pesano
 * quanto una notte in bianco.
 */
export interface Sonno {
  /** Ore di sonno mancanti rispetto al fabbisogno. */
  debito: number
}

/**
 * Quanto si ha fame, da 0 (sazio) a 100 (allo stremo).
 *
 * Cresce col tempo che passa, non con i passi: restare fermi non salva dalla
 * fame. Un pasto conta come un'ora di gioco.
 */
export interface Fame {
  livello: number
}

/** Come sta andando il giro, oggi. */
export interface Mercato {
  /**
   * La quota di clienti ancora disposta a comprare, da 0 a 1.
   *
   * Cala del 30% ogni volta che si colpisce un passante: sparare nel mucchio
   * si paga sul lungo periodo, non sul momento.
   */
  quotaClienti: number
  /**
   * Grammi già comprati oggi al bazar.
   *
   * Il tetto giornaliero dipende dal livello e si azzera solo tornando a casa a
   * mangiare e dormire.
   */
  grammiPresiOggi: number
}

/** Lo stato completo della partita. È questo che viene salvato. */
export interface GameState {
  giocatore: Giocatore
  tempo: Tempo
  sonno: Sonno
  fame: Fame
  mercato: Mercato
  quartiereCorrente: Quartiere
}

/** Di quanto cresce la fame per ogni ora di gioco. */
export const FAME_PER_ORA = 3.5

export function statoIniziale(nome = 'Casu'): GameState {
  return {
    giocatore: {
      nome,
      contante: 20,
      soldiNascosti: 0,
      incassoTotale: 0,
      livello: 1,
      statistiche: { mira: 30, vita: 100, socialita: 40, bellezza: 40 },
      livelloRicerca: 0,
      roba: {},
    },
    tempo: { giorno: 1, ora: 8, minuto: 0 },
    sonno: { debito: 0 },
    fame: { livello: 20 },
    mercato: { quotaClienti: 1, grammiPresiOggi: 0 },
    quartiereCorrente: 'palazzoni',
  }
}
