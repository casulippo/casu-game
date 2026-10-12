import type { Partita } from './tipi'

export interface RigaClassifica {
  clubId: string
  giocate: number
  vinte: number
  pari: number
  perse: number
  golFatti: number
  golSubiti: number
  punti: number
  forma: ('V' | 'N' | 'P')[]
}

// L'ordine di clubIds fa da ultimo criterio: passare i club in ordine alfabetico.
export function classifica(clubIds: string[], partite: Partita[]): RigaClassifica[] {
  const righe = new Map<string, RigaClassifica>(
    clubIds.map((id) => [id, { clubId: id, giocate: 0, vinte: 0, pari: 0, perse: 0, golFatti: 0, golSubiti: 0, punti: 0, forma: [] }]),
  )
  const giocate = partite.filter((p) => p.golCasa !== undefined).sort((a, b) => a.giornata - b.giornata)
  for (const p of giocate) {
    const casa = righe.get(p.casaId)!
    const ospite = righe.get(p.ospiteId)!
    const gc = p.golCasa!
    const go = p.golOspite!
    casa.giocate++
    ospite.giocate++
    casa.golFatti += gc
    casa.golSubiti += go
    ospite.golFatti += go
    ospite.golSubiti += gc
    if (gc > go) {
      casa.vinte++
      casa.punti += 3
      ospite.perse++
      casa.forma.push('V')
      ospite.forma.push('P')
    } else if (gc < go) {
      ospite.vinte++
      ospite.punti += 3
      casa.perse++
      casa.forma.push('P')
      ospite.forma.push('V')
    } else {
      casa.pari++
      ospite.pari++
      casa.punti++
      ospite.punti++
      casa.forma.push('N')
      ospite.forma.push('N')
    }
  }
  // Criteri semplificati rispetto al regolamento (niente scontri diretti): punti, differenza reti, gol fatti.
  return [...righe.values()]
    .map((r) => ({ ...r, forma: r.forma.slice(-5) }))
    .sort(
      (a, b) =>
        b.punti - a.punti ||
        b.golFatti - b.golSubiti - (a.golFatti - a.golSubiti) ||
        b.golFatti - a.golFatti ||
        clubIds.indexOf(a.clubId) - clubIds.indexOf(b.clubId),
    )
}
