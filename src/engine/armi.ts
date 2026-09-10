/**
 * L'armeria.
 *
 * Si comincia col solo coltello, quando ti attaccano in dieci e devi cavartela
 * corpo a corpo. La pistola arriva dal vecchietto dopo il parchetto: colpisce
 * più forte e da lontano, ed è lei a cambiare il gioco.
 *
 * I prezzi qui sono di listino. Quanto si paga davvero dipende da quanto è
 * tranquilla la zona — quello lo decide l'armiere, in `negozi.ts`.
 */

export type TipoArma = 'coltello' | 'pistola' | 'mitraglietta' | 'fucile'

export interface DatiArma {
  id: TipoArma
  nome: string
  /** Il coltello non spara: colpisce chi hai davanti, e basta. */
  corpoACorpo: boolean
  danno: number
  /** Secondi fra un colpo e il successivo. */
  cadenza: number
  /** Fin dove arriva, in celle. */
  gittata: number
  /** Celle al secondo del proiettile. Zero per il corpo a corpo. */
  velocitaProiettile: number
  /**
   * Di quanto il colpo può sbagliare, in radianti, con mira a zero.
   *
   * La mira del protagonista la riduce: a mira piena il colpo va dove punti.
   */
  dispersione: number
  /** Prezzo di listino all'armeria. Il coltello non si compra: ce l'hai. */
  prezzo: number
}

export const ARMI: DatiArma[] = [
  {
    id: 'coltello',
    nome: 'Coltello',
    corpoACorpo: true,
    danno: 30,
    cadenza: 0.5,
    gittata: 1.3,
    velocitaProiettile: 0,
    dispersione: 0,
    prezzo: 0,
  },
  {
    id: 'pistola',
    nome: 'Pistola',
    corpoACorpo: false,
    danno: 22,
    cadenza: 0.4,
    gittata: 12,
    velocitaProiettile: 18,
    dispersione: 0.18,
    prezzo: 400,
  },
  {
    id: 'mitraglietta',
    nome: 'Mitraglietta',
    corpoACorpo: false,
    danno: 12,
    cadenza: 0.12,
    gittata: 10,
    velocitaProiettile: 20,
    // Sputa piombo: da lontano ne va a segno una parte sola.
    dispersione: 0.3,
    prezzo: 1_800,
  },
  {
    id: 'fucile',
    nome: 'Fucile a pompa',
    corpoACorpo: false,
    danno: 55,
    cadenza: 1,
    gittata: 7,
    velocitaProiettile: 16,
    dispersione: 0.35,
    prezzo: 3_200,
  },
]

export function armaPerId(id: TipoArma): DatiArma {
  const trovata = ARMI.find((a) => a.id === id)
  if (!trovata) throw new Error(`Arma sconosciuta: ${id}`)
  return trovata
}
