export const ATTRIBUTI = [
  'riflessi',
  'presa',
  'contrasto',
  'marcatura',
  'colpo_di_testa',
  'passaggio',
  'tecnica',
  'dribbling',
  'tiro',
  'finalizzazione',
  'visione',
  'posizionamento',
  'velocita',
  'resistenza',
  'forza',
] as const

export type Attributo = (typeof ATTRIBUTI)[number]
export type Attributi = Record<Attributo, number>
export type Ruolo = 'Goalkeeper' | 'Defender' | 'Midfield' | 'Attack'

export const RUOLI: Ruolo[] = ['Goalkeeper', 'Defender', 'Midfield', 'Attack']

export const ETICHETTE_ATTRIBUTI: Record<Attributo, string> = {
  riflessi: 'Riflessi',
  presa: 'Presa',
  contrasto: 'Contrasto',
  marcatura: 'Marcatura',
  colpo_di_testa: 'Colpo di testa',
  passaggio: 'Passaggio',
  tecnica: 'Tecnica',
  dribbling: 'Dribbling',
  tiro: 'Tiro',
  finalizzazione: 'Finalizzazione',
  visione: 'Visione',
  posizionamento: 'Posizionamento',
  velocita: 'Velocità',
  resistenza: 'Resistenza',
  forza: 'Forza',
}

// Quanto conta ogni attributo per ruolo: guida la generazione degli attributi e l'overall.
export const PESI: Record<Ruolo, Partial<Attributi>> = {
  Goalkeeper: { riflessi: 5, presa: 4, posizionamento: 3, forza: 1 },
  Defender: { contrasto: 4, marcatura: 4, colpo_di_testa: 3, posizionamento: 3, forza: 2, velocita: 2, passaggio: 1 },
  Midfield: { passaggio: 4, visione: 4, tecnica: 3, resistenza: 3, contrasto: 2, dribbling: 2, tiro: 1 },
  Attack: { finalizzazione: 5, tiro: 4, dribbling: 3, velocita: 3, tecnica: 2, colpo_di_testa: 1 },
}

export function overall(attr: Attributi, ruolo: Ruolo): number {
  let somma = 0
  let pesi = 0
  for (const [a, w] of Object.entries(PESI[ruolo]) as [Attributo, number][]) {
    somma += attr[a] * w
    pesi += w
  }
  return Math.round(((somma / pesi - 1) / 19) * 99 + 1)
}
