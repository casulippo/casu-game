import type { Griglia } from './iso'
import type { GameState } from './state'
import { acquistaAlBazar } from './droga'
import { conRaid } from './polizia'
import { sbloccaArma, unFavoreAllArmiere } from './negozi'

/**
 * Il primo atto.
 *
 * Una macchina a stati e nient'altro: la storia non fa cose per conto suo, si
 * limita a dire a che punto siamo e cosa succede quando il giocatore arriva
 * dove doveva arrivare.
 *
 * L'ordine è quello fissato nel design: prima il parchetto col coltello, poi la
 * pistola del vecchietto, poi l'SMS del bazar ai cento euro, e infine il primo
 * raid della polizia.
 */

export type PassoStoria =
  /** Ripulire il parchetto: quindici della banda avversaria, e solo un coltello. */
  | 'parchetto'
  /** Il vecchietto ti aspetta in armeria. */
  | 'armeria'
  /** Cento euro incassati e arriva l'SMS. */
  | 'sms'
  /** L'offerta del bazar: duecento grammi a cento euro. */
  | 'rifornimento'
  /** Altri cento euro girati, e la polizia si fa viva. */
  | 'primo-raid'
  /** Fine del primo atto: da qui in poi è tutto da scrivere. */
  | 'libero'

/** I messaggi arrivano sul display di un Nokia 3310, una riga per volta. */
export interface Messaggio {
  id: string
  mittente: string
  testo: string
  giorno: number
}

export interface Storia {
  passo: PassoStoria
  messaggi: Messaggio[]
}

/** Quanti della banda tengono il parchetto. */
export const BANDA_DEL_PARCHETTO = 15

/** Quanto bisogna incassare perché arrivi l'SMS del bazar. */
export const INCASSO_PER_SMS = 100

/** Quanto bisogna girare dopo il rifornimento perché arrivi il primo raid. */
export const INCASSO_PER_IL_RAID = 200

/** L'offerta della prima missione: duecento grammi a cento euro. */
export const OFFERTA_BAZAR = { grammi: 200, prezzoAlGrammo: 0.5 }

/** Cosa si deve fare adesso. */
export function obiettivo(stato: GameState): string {
  switch (stato.storia.passo) {
    case 'parchetto':
      return 'Ripulisci il parchetto a nord-ovest'
    case 'armeria':
      return 'Passa in armeria dal vecchietto'
    case 'sms':
      return `Incassa ${INCASSO_PER_SMS} €`
    case 'rifornimento':
      return 'Vai al bazar, dietro i palazzoni'
    case 'primo-raid':
      return `Gira altri ${INCASSO_PER_IL_RAID} €`
    case 'libero':
      return 'Fai più soldi che puoi'
  }
}

/**
 * Il primo scontro.
 *
 * Sono in quindici e tu hai il coltello: da questo non si scappa, ed è per
 * questo che è dichiarato non evitabile.
 */
export function scontroDelParchetto(stato: GameState, posizione: Griglia): GameState {
  if (stato.storia.passo !== 'parchetto' || stato.scontro) return stato

  const raggio = 12
  const banda = Array.from({ length: BANDA_DEL_PARCHETTO }, (_, i) => {
    const angolo = (Math.PI * 2 * i) / BANDA_DEL_PARCHETTO
    return {
      tipo: 'banda' as const,
      pos: {
        x: posizione.x + Math.cos(angolo) * raggio,
        y: posizione.y + Math.sin(angolo) * raggio,
      },
    }
  })

  const conScontro = conRaid(stato, posizione, 0, false)

  return {
    ...conScontro,
    scontro: { ...conScontro.scontro!, nemici: banda.map(nemicoDellaBanda) },
  }
}

let prossimoId = 1

function nemicoDellaBanda(spec: { tipo: 'banda'; pos: Griglia }) {
  return {
    id: prossimoId++,
    tipo: spec.tipo,
    pos: spec.pos,
    vita: 40,
    vitaMax: 40,
    arma: 'coltello' as const,
    ricarica: 0,
  }
}

/**
 * Parchetto ripulito.
 *
 * Arriva il vecchietto, ti ringrazia e ti regala la pistola: nella zona ci sono
 * solo bandelle che gli fanno perdere la clientela rispettabile. Da qui nasce
 * il patto sugli sconti.
 */
export function parchettoRipulito(stato: GameState): GameState {
  if (stato.storia.passo !== 'parchetto') return stato

  const conPistola = unFavoreAllArmiere(sbloccaArma(stato, 'pistola'))

  return conMessaggio(
    { ...conPistola, storia: { ...conPistola.storia, passo: 'armeria' } },
    {
      id: 'armiere-ringrazia',
      mittente: 'Armiere',
      testo:
        'Bravo ragazzo. Passa in armeria quando vuoi: la pistola è tua. ' +
        'Più mi rendi tranquilla la zona, più ti faccio buoni prezzi.',
    },
  )
}

/** Il giocatore è passato in armeria: da lì in poi conta solo l'incasso. */
export function visitaLArmeria(stato: GameState): GameState {
  if (stato.storia.passo !== 'armeria') return stato
  return { ...stato, storia: { ...stato.storia, passo: 'sms' } }
}

/**
 * Cosa la storia si accorge da sola.
 *
 * Guarda l'incasso e fa scattare quello che deve scattare: l'SMS del bazar ai
 * cento euro, e l'attesa del primo raid dopo il rifornimento.
 */
export function controlla(stato: GameState): GameState {
  const { passo } = stato.storia
  const incassato = stato.giocatore.incassoTotale

  if (passo === 'sms' && incassato >= INCASSO_PER_SMS) {
    return conMessaggio(
      { ...stato, storia: { ...stato.storia, passo: 'rifornimento' } },
      {
        id: 'sms-bazar',
        mittente: 'Bazar',
        testo:
          'Hey, bro, ti chiamo perché oggi al bazar abbiamo dei prezzi speciali. ' +
          'Facci sapere se ti serve qualcosa.',
      },
    )
  }

  return stato
}

/**
 * L'offerta del bazar.
 *
 * Duecento grammi a cento euro, una volta sola: «te la do solo perché
 * ultimamente ti vedo in difficoltà, ma sei un bravo ragazzo».
 */
export function compraLOffertaDelBazar(stato: GameState): GameState {
  if (stato.storia.passo !== 'rifornimento') return stato

  const acquisto = acquistaAlBazar(
    stato,
    'marijuana',
    OFFERTA_BAZAR.grammi,
    OFFERTA_BAZAR.prezzoAlGrammo,
    true,
  )
  if (acquisto.motivo !== 'ok') return stato

  const dopo = acquisto.stato

  return conMessaggio(
    { ...dopo, storia: { ...dopo.storia, passo: 'primo-raid' } },
    {
      id: 'offerta-bazar',
      mittente: 'Bazar',
      testo:
        'Te la do solo perché ultimamente ti vedo in difficoltà, ma sei un bravo ' +
        'ragazzo. Questa è buona, la puoi vendere anche a dieci al grammo.',
    },
  )
}

/**
 * Il primo raid della polizia.
 *
 * Da questo si può scappare — è quello che insegna a scappare — quindi nasce
 * evitabile come tutti quelli che verranno dopo.
 */
export function forsePrimoRaid(stato: GameState, posizione: Griglia): GameState {
  const bastano =
    stato.storia.passo === 'primo-raid' &&
    !stato.scontro &&
    stato.giocatore.incassoTotale >= INCASSO_PER_SMS + INCASSO_PER_IL_RAID

  if (!bastano) return stato

  return conMessaggio(
    { ...conRaid(stato, posizione, 4), storia: { ...stato.storia, passo: 'libero' } },
    {
      id: 'primo-raid',
      mittente: 'Bazar',
      testo: 'Bro, occhio che oggi in giro c è casino. Mettiti il cappuccio.',
    },
  )
}

/** L'ultimo messaggio arrivato, quello che sta sul display. */
export function ultimoMessaggio(stato: GameState): Messaggio | null {
  return stato.storia.messaggi.at(-1) ?? null
}

function conMessaggio(stato: GameState, messaggio: Omit<Messaggio, 'giorno'>): GameState {
  if (stato.storia.messaggi.some((m) => m.id === messaggio.id)) return stato

  return {
    ...stato,
    storia: {
      ...stato.storia,
      messaggi: [...stato.storia.messaggi, { ...messaggio, giorno: stato.tempo.giorno }],
    },
  }
}
