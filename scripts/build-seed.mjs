// Costruisce public/seed.sqlite: il mondo iniziale di una nuova carriera.
// Dati reali: Transfermarkt (anagrafica, valori, contratti, statistiche base) + stipendi Serie A.
// Dati inventati (marcati): attributi di gioco e giocatori non trovati su Transfermarkt.
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { DuckDBInstance } from '@duckdb/node-api'
import { ATTRIBUTI, PESI, overall } from '../src/engine/attributi.ts'
import { rng } from '../src/engine/rng.ts'

const TM_URL = 'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb'
const TM_FILE = 'data/raw/transfermarkt.duckdb'
const STIPENDI = 'data/stipendi-serie-a-2026-27.json'
const SEED = 'public/seed.sqlite'
const STAGIONE_STATS = '2025'

const CLUB_TM = {
  Atalanta: '800', Bologna: '1025', Cagliari: '1390', Como: '1047', Fiorentina: '430',
  Frosinone: '8970', Genoa: '252', Inter: '46', Juventus: '506', Lazio: '398',
  Lecce: '1005', Milan: '5', Monza: '2919', Napoli: '6195', Parma: '130',
  Roma: '12', Sassuolo: '6574', Torino: '416', Udinese: '410', Venezia: '607',
}

async function scaricaTransfermarkt() {
  if (existsSync(TM_FILE)) return
  await mkdir('data/raw', { recursive: true })
  console.log('Scarico Transfermarkt (~210 MB)...')
  const res = await fetch(TM_URL)
  if (!res.ok) throw new Error(`Transfermarkt: HTTP ${res.status}`)
  await writeFile(TM_FILE, Buffer.from(await res.arrayBuffer()))
}

const chiave = (nome) =>
  nome
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[øØ]/g, 'o')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function distanza(a, b) {
  let prec = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const riga = [i]
    for (let j = 1; j <= b.length; j++)
      riga[j] = Math.min(prec[j] + 1, riga[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prec = riga
  }
  return prec[b.length]
}

function generaAttributi(id, ruolo, valore, eta) {
  const r = rng(`attr:${id}`)
  // Attributi chiave del ruolo: ~11,5 a 1M€, ~17,7 a 100M€ (overall ~55 e ~88).
  const livello = 11.5 + 3.1 * Math.log10(Math.max(valore, 1e5) / 1e6)
  const pesi = PESI[ruolo] ?? PESI.Midfield
  const attr = {}
  for (const a of ATTRIBUTI) {
    const scarto = pesi[a] ? (pesi[a] - 3) * 0.4 : ruolo === 'Goalkeeper' ? -7 : -3
    let v = livello + scarto + (r() - 0.5) * 3
    if (a === 'velocita' && eta > 29) v -= (eta - 29) * 0.5
    if (a === 'visione' && eta > 27) v += 1
    if ((a === 'riflessi' || a === 'presa') && ruolo !== 'Goalkeeper') v = 1 + r() * 4
    attr[a] = Math.round(Math.min(20, Math.max(1, v)))
  }
  return attr
}

const COMPETIZIONI_IT = {
  IT1: 'Serie A', CIT: 'Coppa Italia', SCI: 'Supercoppa Italiana', CL: 'Champions League',
  EL: 'Europa League', UCOL: 'Conference League', KLUB: 'Mondiale per club', FIWC: 'Mondiali',
  EM24: 'Europei', CLQ: 'Qualificazioni Champions', ELQ: 'Qualificazioni Europa League',
  ECLQ: 'Qualificazioni Conference', USC: 'Supercoppa UEFA',
}
const nomeCompetizione = (slug, codice) =>
  COMPETIZIONI_IT[codice] ?? (slug ? slug.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') : codice)

function etaAl(data, nascita) {
  const d = new Date(data)
  const n = new Date(nascita)
  return d.getFullYear() - n.getFullYear() - (d < new Date(d.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0)
}

const NOMI_FINTI_RUOLI = ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Midfield', 'Midfield', 'Midfield', 'Attack', 'Attack']

async function main() {
  await scaricaTransfermarkt()
  const tm = await (await DuckDBInstance.create(TM_FILE, { access_mode: 'READ_ONLY' })).connect()
  const q = async (sql) => (await tm.runAndReadAll(sql)).getRowObjectsJS()

  const giocatoriTm = await q(`
    select player_id::varchar id, name, first_name, last_name, current_club_id::varchar club_id,
      strftime(date_of_birth, '%Y-%m-%d') nascita, country_of_citizenship nazionalita,
      position ruolo, sub_position sottoruolo, foot piede, height_in_cm::int altezza,
      market_value_in_eur::double valore, highest_market_value_in_eur::double valore_max,
      strftime(contract_expiration_date, '%Y-%m-%d') scadenza, image_url foto, last_season
    from players where last_season >= '2021'`)

  const perChiave = new Map()
  for (const g of giocatoriTm) {
    for (const k of new Set([chiave(g.name), chiave(`${g.first_name ?? ''} ${g.last_name ?? ''}`)])) {
      if (!k) continue
      if (!perChiave.has(k)) perChiave.set(k, [])
      perChiave.get(k).push(g)
    }
  }
  const perCognome = new Map()
  for (const g of giocatoriTm) {
    const k = `${g.club_id}|${chiave(g.last_name ?? g.name)}`
    if (!perCognome.has(k)) perCognome.set(k, [])
    perCognome.get(k).push(g)
  }

  // Priorità: stesso club > unico omonimo nell'archivio > cognome unico nello stesso club.
  function abbina(nome, clubId) {
    const k = chiave(nome)
    const candidati = perChiave.get(k) ?? []
    const stessoClub = candidati.filter((g) => g.club_id === clubId)
    if (stessoClub.length === 1) return stessoClub[0]
    if (candidati.length === 1) return candidati[0]
    if (candidati.length > 1) return [...candidati].sort((a, b) => b.last_season.localeCompare(a.last_season) || b.valore - a.valore)[0]
    const cognome = perCognome.get(`${clubId}|${k.split(' ').at(-1)}`) ?? []
    if (cognome.length === 1) return cognome[0]
    const unico = perCognome.get(`${clubId}|${k}`) ?? []
    if (unico.length === 1) return unico[0]
    return abbinaConRefusi(k, clubId)
  }

  // Nomi Virgilio spesso con refusi (Osmaijc, Gudmunsson): tollera al massimo 2 lettere diverse.
  function abbinaConRefusi(k, clubId) {
    const vicini = []
    for (const [altra, gs] of perChiave) {
      if (Math.abs(altra.length - k.length) > 2) continue
      if (distanza(k, altra) <= 2) vicini.push(...gs)
    }
    const stessoClub = vicini.filter((g) => g.club_id === clubId)
    if (stessoClub.length === 1) return stessoClub[0]
    return new Set(vicini.map((g) => g.id)).size === 1 ? vicini[0] : null
  }

  const stipendi = JSON.parse(await readFile(STIPENDI, 'utf8'))
  const clubTm = await q(`
    select club_id::varchar id, name, stadium_name stadio, stadium_seats::int posti, coach_name allenatore
    from clubs where club_id in (${Object.values(CLUB_TM).map((id) => `'${id}'`).join(',')})`)
  const clubInfo = new Map(clubTm.map((c) => [c.id, c]))

  await rm(SEED, { force: true })
  const db = new DatabaseSync(SEED)
  db.exec(`
    create table meta (chiave text primary key, valore text);
    create table campionati (id text primary key, nome text, paese text);
    create table club (id text primary key, nome text, nome_completo text, campionato_id text, stadio text, posti integer, allenatore text);
    create table giocatori (
      id text primary key, nome text, nascita text, nazionalita text, ruolo text, sottoruolo text,
      piede text, altezza integer, valore integer, valore_max integer, foto text,
      club_id text, scadenza text, stipendio_netto integer, stipendio_lordo integer, fonte_stipendio text,
      reale integer, ${ATTRIBUTI.map((a) => `${a} integer`).join(', ')}, overall integer, attributi_reali integer
    );
    create table valutazioni (giocatore_id text, data text, valore integer);
    create table statistiche (giocatore_id text, stagione text, competizione text, competizione_nome text, presenze integer, minuti integer, gol integer, assist integer, gialli integer, rossi integer);
    create table trasferimenti (giocatore_id text, data text, stagione text, da_club text, a_club text, costo integer);
  `)
  db.prepare('insert into meta values (?, ?)').run('stagione', '2026-27')
  db.prepare('insert into meta values (?, ?)').run('generato', new Date().toISOString())
  db.prepare('insert into campionati values (?, ?, ?)').run('IT1', 'Serie A', 'Italia')

  const insClub = db.prepare('insert into club values (?, ?, ?, ?, ?, ?, ?)')
  for (const [nome, id] of Object.entries(CLUB_TM)) {
    const c = clubInfo.get(id)
    insClub.run(id, nome, c?.name ?? nome, 'IT1', c?.stadio ?? null, c?.posti ?? null, c?.allenatore ?? null)
  }

  const insG = db.prepare(`insert into giocatori values (${Array(19 + ATTRIBUTI.length).fill('?').join(', ')})`)
  const reali = []
  let abbinati = 0
  const nonAbbinati = []
  const visti = new Set()
  for (const s of stipendi.giocatori) {
    const clubId = CLUB_TM[s.club]
    const g = abbina(s.giocatore, clubId)
    if (g && visti.has(g.id)) continue
    const r = rng(`finto:${s.club}:${s.giocatore}`)
    let rec
    if (g) {
      abbinati++
      visti.add(g.id)
      reali.push(g.id)
      rec = {
        id: g.id, nome: s.giocatore, nascita: g.nascita, nazionalita: g.nazionalita, ruolo: g.ruolo,
        sottoruolo: g.sottoruolo, piede: g.piede, altezza: g.altezza, valore: g.valore, valore_max: g.valore_max,
        foto: g.foto, scadenza: g.scadenza, reale: 1,
      }
    } else {
      nonAbbinati.push(`${s.club}: ${s.giocatore}`)
      const ruolo = NOMI_FINTI_RUOLI[Math.floor(r() * NOMI_FINTI_RUOLI.length)]
      const anno = 1992 + Math.floor(r() * 16)
      rec = {
        id: `fake-${chiave(s.club)}-${chiave(s.giocatore).replace(/ /g, '-')}`, nome: s.giocatore,
        nascita: `${anno}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`, nazionalita: null, ruolo,
        sottoruolo: null, piede: r() < 0.75 ? 'right' : 'left', altezza: 170 + Math.floor(r() * 20),
        // Senza valore reale: stimato dallo stipendio lordo (circa 4 anni di ingaggio).
        valore: Math.round((s.lordoMln * 4e6) / 1e5) * 1e5, valore_max: null, foto: null,
        scadenza: `${2027 + Math.floor(r() * 3)}-06-30`, reale: 0,
      }
    }
    if (!rec.ruolo || rec.ruolo === 'Missing') rec.ruolo = 'Midfield'
    const eta = rec.nascita ? etaAl('2026-09-01', rec.nascita) : 25
    const attr = generaAttributi(rec.id, rec.ruolo, rec.valore ?? 1e6, eta)
    insG.run(
      rec.id, rec.nome, rec.nascita, rec.nazionalita, rec.ruolo, rec.sottoruolo, rec.piede, rec.altezza,
      rec.valore, rec.valore_max, rec.foto, clubId, rec.scadenza,
      Math.round(s.nettoMln * 1e6), Math.round(s.lordoMln * 1e6), s.fonte, rec.reale,
      ...ATTRIBUTI.map((a) => attr[a]), overall(attr, rec.ruolo), 0,
    )
  }

  const ids = reali.map((id) => `'${id}'`).join(',')
  const insV = db.prepare('insert into valutazioni values (?, ?, ?)')
  for (const v of await q(`select player_id::varchar g, strftime(date, '%Y-%m-%d') d, market_value_in_eur::bigint v from player_valuations where player_id::varchar in (${ids}) order by date`))
    insV.run(v.g, v.d, Number(v.v))
  const insS = db.prepare('insert into statistiche values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const s of await q(`
    select a.player_id::varchar g, ga.season s, a.competition_id c, any_value(co.name) cn, count(*)::int p, sum(minutes_played)::int m,
      sum(goals)::int gol, sum(assists)::int ass, sum(yellow_cards)::int y, sum(red_cards)::int r
    from appearances a join games ga using (game_id) left join competitions co on co.competition_id = a.competition_id
    where a.player_id::varchar in (${ids}) and ga.season >= '${Number(STAGIONE_STATS) - 2}'
    group by a.player_id, ga.season, a.competition_id`))
    insS.run(s.g, s.s, s.c, nomeCompetizione(s.cn, s.c), s.p, s.m, s.gol, s.ass, s.y, s.r)
  const insT = db.prepare('insert into trasferimenti values (?, ?, ?, ?, ?, ?)')
  for (const t of await q(`select player_id::varchar g, strftime(transfer_date, '%Y-%m-%d') d, transfer_season s, from_club_name da, to_club_name a, transfer_fee::bigint f from transfers where player_id::varchar in (${ids})`))
    insT.run(t.g, t.d, t.s, t.da, t.a, t.f === null ? null : Number(t.f))

  db.exec('create index giocatori_club on giocatori(club_id); create index valutazioni_g on valutazioni(giocatore_id); create index statistiche_g on statistiche(giocatore_id)')
  db.exec('vacuum')
  db.close()

  console.log(`Giocatori: ${stipendi.giocatori.length}, abbinati a Transfermarkt: ${abbinati}, inventati: ${nonAbbinati.length}`)
  await writeFile('data/non-abbinati.txt', nonAbbinati.join('\n') + '\n')
  console.log(`Elenco non abbinati in data/non-abbinati.txt -> ${SEED}`)
}

await main()
