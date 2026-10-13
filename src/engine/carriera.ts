import { generaCalendario } from './calendario'
import { classifica } from './classifica'
import { formazione, giocaPartita, type Fase } from './partita'
import { invecchia } from './progressione'
import { tipoEvento, type Carriera, type Club, type Giocatore, type Partita } from './tipi'

export function nuovaCarriera(club: Club[], giocatori: Giocatore[], clubUtente: string, stagione: string, seme: string): Carriera {
  return {
    versione: 1,
    seme,
    stagione,
    clubUtente,
    modulo: '4-3-3',
    esclusi: [],
    calendario: generaCalendario(club.map((c) => c.id), `${seme}:${stagione}`),
    club,
    giocatori: Object.fromEntries(giocatori.map((g) => [g.id, g])),
    storico: [],
    creata: new Date().toISOString(),
  }
}

export const rosa = (c: Carriera, clubId: string) => Object.values(c.giocatori).filter((g) => g.clubId === clubId)

export const ultimaGiornata = (c: Carriera) => Math.max(...c.calendario.map((p) => p.giornata))

export function prossimaGiornata(c: Carriera): number | null {
  const daGiocare = c.calendario.filter((p) => p.golCasa === undefined)
  return daGiocare.length ? Math.min(...daGiocare.map((p) => p.giornata)) : null
}

export function xiDi(c: Carriera, clubId: string): Giocatore[] {
  const utente = clubId === c.clubUtente
  return formazione(rosa(c, clubId), utente ? c.modulo : '4-3-3', utente ? c.esclusi : [])
}

export const MAX_CAMBI = 5

// Sostituzioni: giocatori entrati in qualunque momento che non erano tra i titolari.
export const cambi = (titolari: Giocatore[], formazioni: Giocatore[][]) =>
  new Set(formazioni.flat().filter((g) => !titolari.includes(g))).size

// fasiUtente: formazioni decise dall'utente durante la partita; senza, decide il vice e restano i titolari.
export function giocaGiornata(c: Carriera, fasiUtente?: Fase[]): Carriera {
  const g = prossimaGiornata(c)
  if (g === null) return c
  const giocatori = { ...c.giocatori }
  const aggiorna = (id: string, f: (s: Giocatore['stagione']) => Giocatore['stagione']) => {
    giocatori[id] = { ...giocatori[id], stagione: f(giocatori[id].stagione) }
  }
  const calendario: Partita[] = c.calendario.map((p) => {
    if (p.giornata !== g) return p
    const ris = giocaPartita(p, xiDi(c, p.casaId), xiDi(c, p.ospiteId), `${c.seme}:${c.stagione}`, {
      casa: p.casaId === c.clubUtente ? fasiUtente : undefined,
      ospite: p.ospiteId === c.clubUtente ? fasiUtente : undefined,
    })
    for (const id of [...ris.xiCasa, ...ris.xiOspite]) aggiorna(id, (s) => ({ ...s, presenze: s.presenze + 1 }))
    for (const e of ris.eventi) {
      if (tipoEvento(e) !== 'gol') continue
      aggiorna(e.marcatoreId, (s) => ({ ...s, gol: s.gol + 1 }))
      if (e.assistId) aggiorna(e.assistId, (s) => ({ ...s, assist: s.assist + 1 }))
    }
    return { ...p, golCasa: ris.golCasa, golOspite: ris.golOspite, eventi: ris.eventi }
  })
  return { ...c, calendario, giocatori }
}

export function simulaFinoAllaFine(c: Carriera): Carriera {
  let attuale = c
  while (prossimaGiornata(attuale) !== null) attuale = giocaGiornata(attuale)
  return attuale
}

const annoSuccessivo = (stagione: string) => {
  const inizio = Number(stagione.slice(0, 4)) + 1
  return `${inizio}-${String(inizio + 1).slice(2)}`
}

export function nuovaStagione(c: Carriera): Carriera {
  const tabella = classifica(c.club.map((x) => x.id), c.calendario)
  const posizione = tabella.findIndex((r) => r.clubId === c.clubUtente)
  const fine = `${Number(c.stagione.slice(0, 4)) + 1}-06-30`
  const stagione = annoSuccessivo(c.stagione)
  const giocatori = Object.fromEntries(
    Object.values(c.giocatori).map((g) => {
      const cresciuto = invecchia(g, fine, g.stagione.presenze, `${c.seme}:${c.stagione}`)
      // Rinnovo automatico di due anni alla scadenza: il mercato non esiste ancora.
      const scadenza = !g.scadenza || g.scadenza <= fine ? `${Number(fine.slice(0, 4)) + 2}-06-30` : g.scadenza
      return [g.id, { ...cresciuto, scadenza, stagione: { presenze: 0, gol: 0, assist: 0 } }]
    }),
  )
  return {
    ...c,
    stagione,
    giocatori,
    calendario: generaCalendario(c.club.map((x) => x.id), `${c.seme}:${stagione}`),
    storico: [
      ...c.storico,
      { stagione: c.stagione, campioneId: tabella[0].clubId, posizioneUtente: posizione + 1, puntiUtente: tabella[posizione].punti },
    ],
  }
}
