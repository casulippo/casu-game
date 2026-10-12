import { ATTRIBUTI, type Attributi, type Ruolo } from '../engine/attributi'
import type { Club, Giocatore, StatReale } from '../engine/tipi'

type Riga = Record<string, unknown>

export const QUERY = {
  meta: 'select chiave, valore from meta',
  club: 'select * from club order by nome',
  giocatori: 'select * from giocatori',
  statistiche: 'select * from statistiche order by stagione desc, minuti desc',
}

export interface Mondo {
  stagione: string
  club: Club[]
  giocatori: Giocatore[]
}

const testo = (v: unknown) => (v === null || v === undefined ? null : String(v))

export function mondoDaRighe(meta: Riga[], club: Riga[], giocatori: Riga[], statistiche: Riga[]): Mondo {
  const stats = new Map<string, StatReale[]>()
  for (const s of statistiche) {
    const id = String(s.giocatore_id)
    if (!stats.has(id)) stats.set(id, [])
    stats.get(id)!.push({
      stagione: String(s.stagione),
      competizione: String(s.competizione_nome ?? s.competizione),
      presenze: Number(s.presenze),
      minuti: Number(s.minuti),
      gol: Number(s.gol),
      assist: Number(s.assist),
    })
  }
  return {
    stagione: String(meta.find((m) => m.chiave === 'stagione')?.valore ?? '2026-27'),
    club: club.map((c) => ({
      id: String(c.id),
      nome: String(c.nome),
      stadio: testo(c.stadio),
      posti: c.posti === null ? null : Number(c.posti),
      allenatore: testo(c.allenatore),
    })),
    giocatori: giocatori.map((g) => ({
      id: String(g.id),
      nome: String(g.nome),
      nascita: testo(g.nascita),
      nazionalita: testo(g.nazionalita),
      ruolo: String(g.ruolo) as Ruolo,
      sottoruolo: testo(g.sottoruolo),
      piede: testo(g.piede),
      altezza: g.altezza === null ? null : Number(g.altezza),
      valore: Number(g.valore ?? 0),
      foto: testo(g.foto),
      clubId: String(g.club_id),
      scadenza: testo(g.scadenza),
      stipendioNetto: Number(g.stipendio_netto),
      stipendioLordo: Number(g.stipendio_lordo),
      fonteStipendio: String(g.fonte_stipendio),
      reale: Number(g.reale) === 1,
      attr: Object.fromEntries(ATTRIBUTI.map((a) => [a, Number(g[a])])) as Attributi,
      overall: Number(g.overall),
      statsReali: stats.get(String(g.id)) ?? [],
      stagione: { presenze: 0, gol: 0, assist: 0 },
    })),
  }
}
