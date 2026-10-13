import type { Attributi, Ruolo } from './attributi'

export interface StatReale {
  stagione: string
  competizione: string
  presenze: number
  minuti: number
  gol: number
  assist: number
}

export interface StatStagione {
  presenze: number
  gol: number
  assist: number
}

export interface Giocatore {
  id: string
  nome: string
  nascita: string | null
  nazionalita: string | null
  ruolo: Ruolo
  sottoruolo: string | null
  piede: string | null
  altezza: number | null
  valore: number
  foto: string | null
  clubId: string
  scadenza: string | null
  stipendioNetto: number
  stipendioLordo: number
  fonteStipendio: string
  reale: boolean
  attr: Attributi
  overall: number
  statsReali: StatReale[]
  stagione: StatStagione
}

export interface Club {
  id: string
  nome: string
  stadio: string | null
  posti: number | null
  allenatore: string | null
}

export type TipoEvento = 'gol' | 'parata' | 'fuori' | 'palo' | 'giallo'

export interface Evento {
  minuto: number
  // Istante esatto in minuti di gioco (assente nei salvataggi più vecchi).
  t?: number
  clubId: string
  // Assente nei salvataggi creati prima della cronaca: vale 'gol'.
  tipo?: TipoEvento
  // Protagonista dell'evento: marcatore, tiratore o ammonito.
  marcatoreId: string
  assistId: string | null
  portiereId?: string
}

export const tipoEvento = (e: Evento): TipoEvento => e.tipo ?? 'gol'

export interface Partita {
  giornata: number
  casaId: string
  ospiteId: string
  golCasa?: number
  golOspite?: number
  eventi?: Evento[]
  statistiche?: {
    possessoCasa: number
    passaggi: [number, number]
    passaggiRiusciti: [number, number]
    tiri: [number, number]
    specchio: [number, number]
  }
}

export const MODULI = {
  '4-3-3': { Goalkeeper: 1, Defender: 4, Midfield: 3, Attack: 3 },
  '4-4-2': { Goalkeeper: 1, Defender: 4, Midfield: 4, Attack: 2 },
  '3-5-2': { Goalkeeper: 1, Defender: 3, Midfield: 5, Attack: 2 },
  '4-5-1': { Goalkeeper: 1, Defender: 4, Midfield: 5, Attack: 1 },
} as const satisfies Record<string, Record<Ruolo, number>>

export type Modulo = keyof typeof MODULI

export interface StoricoStagione {
  stagione: string
  campioneId: string
  posizioneUtente: number
  puntiUtente: number
}

export interface Carriera {
  versione: 1
  seme: string
  stagione: string
  clubUtente: string
  modulo: Modulo
  esclusi: string[]
  calendario: Partita[]
  club: Club[]
  giocatori: Record<string, Giocatore>
  storico: StoricoStagione[]
  creata: string
}
