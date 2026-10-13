import type { Ruolo } from './attributi'
import type { Giocatore } from './tipi'

// Campo in metri: x da 0 a 105 (la squadra di casa attacca verso destra), y da 0 a 68.
export const LUNGHEZZA = 105
export const LARGHEZZA = 68
export const CENTRO = { x: LUNGHEZZA / 2, y: LARGHEZZA / 2 }
export const PALO_ALTO = 30.34
export const PALO_BASSO = 37.66

export interface Punto {
  x: number
  y: number
}

export interface Posto {
  id: string
  nome: string
  ruolo: Ruolo
  numero: number
  casa: boolean
  base: Punto
}

const RIGA: Record<Ruolo, number> = { Goalkeeper: 4, Defender: 20, Midfield: 37, Attack: 51 }
const ORDINE_RUOLI: Ruolo[] = ['Goalkeeper', 'Defender', 'Midfield', 'Attack']

export const limita = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
export const distanza = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y)

// Stesso sistema per le due squadre: ognuna "vede" il campo attaccando verso x crescenti.
export const nelVerso = (p: Punto, casa: boolean): Punto => (casa ? p : { x: LUNGHEZZA - p.x, y: LARGHEZZA - p.y })

const lato = (g: Giocatore) => (/Left/i.test(g.sottoruolo ?? '') ? 0 : /Right/i.test(g.sottoruolo ?? '') ? 2 : 1)

export function disponi(xi: Giocatore[], casa: boolean): Posto[] {
  const posti: Posto[] = []
  let numero = 1
  for (const ruolo of ORDINE_RUOLI) {
    const riga = xi.filter((g) => g.ruolo === ruolo).sort((a, b) => lato(a) - lato(b) || b.overall - a.overall)
    riga.forEach((g, i) => {
      const base = { x: RIGA[ruolo], y: (LARGHEZZA * (i + 1)) / (riga.length + 1) }
      posti.push({ id: g.id, nome: g.nome, ruolo, numero: numero++, casa, base: nelVerso(base, casa) })
    })
  }
  return posti
}

const PESO_RUOLO: Record<Ruolo, number> = { Goalkeeper: 0, Defender: 0.85, Midfield: 1, Attack: 1.1 }

// Posizioni di tutti i giocatori dato dove sta la palla e chi la ha.
// Chi attacca sale e si allarga, chi difende scala verso la propria porta e verso la palla;
// nessun attaccante oltre l'ultimo difensore (fuorigioco), tranne chi porta palla.
// La forma si ricalcola a ogni tocco: le squadre già divise si tengono da parte.
const divise = new WeakMap<Posto[], { casa: Posto[]; ospite: Posto[] }>()
const perSquadra = (posti: Posto[]) => {
  let d = divise.get(posti)
  if (!d) {
    d = { casa: posti.filter((p) => p.casa), ospite: posti.filter((p) => !p.casa) }
    divise.set(posti, d)
  }
  return d
}

export function forma(posti: Posto[], palla: Punto, possessoCasa: boolean | null): Map<string, Punto> {
  const posizioni = new Map<string, Punto>()
  const squadre = perSquadra(posti)
  const squadra = (casa: boolean) => {
    const b = nelVerso(palla, casa)
    const inPossesso = possessoCasa === casa
    const avanzamento = inPossesso ? limita((b.x - 35) * 0.55, -8, 28) : limita((b.x - 60) * 0.5, -22, 12)
    for (const q of casa ? squadre.casa : squadre.ospite) {
      const base = nelVerso(q.base, casa)
      let x: number
      let y: number
      if (q.ruolo === 'Goalkeeper') {
        x = limita(3 + Math.max(0, b.x - 40) * 0.12, 2, 16)
        y = CENTRO.y + (b.y - CENTRO.y) * 0.15
      } else {
        x = base.x + avanzamento * PESO_RUOLO[q.ruolo]
        // Senza palla la squadra si stringe verso il lato della palla; con la palla resta più larga.
        y = base.y + (b.y - CENTRO.y) * (inPossesso ? 0.2 : 0.4)
      }
      posizioni.set(q.id, nelVerso({ x, y }, casa))
    }
  }
  squadra(true)
  squadra(false)
  if (possessoCasa !== null) {
    let linea = -Infinity
    for (const d of possessoCasa ? squadre.ospite : squadre.casa) {
      if (d.ruolo !== 'Goalkeeper') linea = Math.max(linea, nelVerso(posizioni.get(d.id)!, possessoCasa).x)
    }
    const limite = Math.max(linea, nelVerso(palla, possessoCasa).x)
    for (const q of possessoCasa ? squadre.casa : squadre.ospite) {
      if (q.ruolo === 'Goalkeeper') continue
      const p = nelVerso(posizioni.get(q.id)!, possessoCasa)
      if (p.x > limite) posizioni.set(q.id, nelVerso({ x: limite - 0.5, y: p.y }, possessoCasa))
    }
  }
  for (const p of posizioni.values()) {
    p.x = limita(p.x, 1, LUNGHEZZA - 1)
    p.y = limita(p.y, 1, LARGHEZZA - 1)
  }
  return posizioni
}
