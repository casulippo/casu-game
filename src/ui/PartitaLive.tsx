import { lazy, Suspense, useMemo, useState } from 'react'
import { cambi, giocaGiornata, MAX_CAMBI, prossimaGiornata, rosa, xiDi } from '../engine/carriera'
import { formazione, possesso } from '../engine/partita'
import { MODULI, tipoEvento, type Carriera, type Evento, type Giocatore, type Modulo, type Partita } from '../engine/tipi'
import { Campo2D } from './campo/Campo2D'
import { divise } from './campo/colori'
import { useOrologio } from './campo/orologio'
import { creaScena, segmentoA } from './campo/scena'
import { Bottone, Overall } from './comuni'
import { RUOLO_BREVE } from './formato'

const Campo3D = lazy(() => import('./campo/Campo3D'))

type Fase = 'primo' | 'intervallo' | 'secondo' | 'fine'
type Vista = '2d' | '3d' | 'cronaca'

// Secondi reali per minuto di gioco: nelle azioni salienti il tempo rallenta per seguirle.
const RITMI = [
  { nome: 'Lenta', gioco: 0.8, azione: 11 },
  { nome: 'Normale', gioco: 0.4, azione: 6.5 },
  { nome: 'Veloce', gioco: 0.15, azione: 3 },
]

const VISTE: { id: Vista; nome: string }[] = [
  { id: '2d', nome: 'Campo 2D' },
  { id: '3d', nome: 'Campo 3D' },
  { id: 'cronaca', nome: 'Solo cronaca' },
]

function vistaSalvata(): Vista {
  try {
    const v = localStorage.getItem('vista-partita')
    return v === '3d' || v === 'cronaca' ? v : '2d'
  } catch {
    return '2d'
  }
}

const ETICHETTA: Record<string, { testo: string; stile: string }> = {
  gol: { testo: 'GOL', stile: 'bg-emerald-400 text-emerald-950' },
  parata: { testo: 'PARATA', stile: 'bg-sky-400/20 text-sky-200' },
  fuori: { testo: 'FUORI', stile: 'bg-white/10 text-slate-300' },
  palo: { testo: 'PALO', stile: 'bg-orange-400/20 text-orange-200' },
  giallo: { testo: 'GIALLO', stile: 'bg-yellow-300 text-yellow-950' },
}

const stessa = (a: Partita, b: Partita) => a.casaId === b.casaId && a.ospiteId === b.ospiteId

export function PartitaLive({
  carriera,
  onFine,
}: {
  carriera: Carriera
  onFine: (c: Carriera) => void
}) {
  const [giornata] = useState(() => prossimaGiornata(carriera)!)
  const [ripresa, setRipresa] = useState(false)
  const [ritmo, setRitmo] = useState(RITMI[1])
  const [vista, setVista] = useState<Vista>(vistaSalvata)
  const [modulo2, setModulo2] = useState<Modulo>(carriera.modulo)
  const [esclusi2, setEsclusi2] = useState<string[]>(carriera.esclusi)
  const [secondoTempo, setSecondoTempo] = useState<Giocatore[]>()

  const dati = useMemo(() => {
    const mia = carriera.calendario.find(
      (p) => p.giornata === giornata && (p.casaId === carriera.clubUtente || p.ospiteId === carriera.clubUtente),
    )!
    const avversario = mia.casaId === carriera.clubUtente ? mia.ospiteId : mia.casaId
    const xi1 = xiDi(carriera, carriera.clubUtente)
    const xiAvversario = xiDi(carriera, avversario)
    const anteprima = giocaGiornata(carriera, secondoTempo)
    const partite = anteprima.calendario.filter((p) => p.giornata === giornata)
    const partitaMia = partite.find((p) => stessa(p, mia))!
    const mie: [Giocatore[], Giocatore[]] = [xi1, secondoTempo ?? xi1]
    const loro: [Giocatore[], Giocatore[]] = [xiAvversario, xiAvversario]
    const inCasa = mia.casaId === carriera.clubUtente
    const scena = creaScena(
      partitaMia,
      { casa: inCasa ? mie : loro, ospite: inCasa ? loro : mie },
      possesso(inCasa ? xi1 : xiAvversario, inCasa ? xiAvversario : xi1),
      `${carriera.seme}:${carriera.stagione}`,
    )
    // Momento in cui ogni evento si vede in campo: il tiro arriva a fine azione.
    const momenti = new Map<Evento, number>(
      scena.segmenti.filter((s) => s.tipo === 'dopo' && s.evento).map((s) => [s.evento!, s.inizio]),
    )
    return { mia, xi1, xiAvversario, anteprima, partite, partitaMia, scena, momenti, colori: divise(mia.casaId, mia.ospiteId) }
  }, [carriera, giornata, secondoTempo])
  const { mia, xi1, xiAvversario, anteprima, partite, partitaMia, scena, momenti, colori: coloriSquadre } = dati

  const orologio = useOrologio(ripresa ? 90 : 45, (t) => {
    const s = segmentoA(scena, t)
    const saliente = s !== undefined && s.tipo !== 'gioco'
    if (vista === 'cronaca') return saliente ? ritmo.gioco * 3 : ritmo.gioco
    return saliente ? ritmo.azione : ritmo.gioco
  })
  const minuto = orologio.t
  const fase: Fase = minuto < 45 ? 'primo' : !ripresa ? 'intervallo' : minuto < 90 ? 'secondo' : 'fine'
  const momento = (e: Evento) => momenti.get(e) ?? e.minuto
  const eventi = (partitaMia.eventi ?? []).filter((e) => momento(e) <= minuto)

  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const nomiGiocatori = Object.fromEntries(Object.values(carriera.giocatori).map((g) => [g.id, g.nome]))
  const bozza2 = formazione(rosa(carriera, carriera.clubUtente), modulo2, esclusi2)

  const punteggio = (p: Partita) => {
    const fino = (p.eventi ?? []).filter((e) => (p === partitaMia ? momento(e) : e.minuto) <= minuto && tipoEvento(e) === 'gol')
    return [fino.filter((e) => e.clubId === p.casaId).length, fino.filter((e) => e.clubId === p.ospiteId).length]
  }
  const [golCasa, golOspite] = punteggio(partitaMia)
  const xiCasa = mia.casaId === carriera.clubUtente ? (secondoTempo && minuto > 45 ? secondoTempo : xi1) : xiAvversario
  const xiOspite = mia.ospiteId === carriera.clubUtente ? (secondoTempo && minuto > 45 ? secondoTempo : xi1) : xiAvversario
  const conta = (clubId: string, tipi: string[]) => eventi.filter((e) => e.clubId === clubId && tipi.includes(tipoEvento(e))).length
  const nCambi = cambi(xi1, bozza2)
  const segmento = segmentoA(scena, minuto)

  const salta = () => orologio.salta(fase === 'primo' ? 45 : 90)
  const scegliVista = (v: Vista) => {
    setVista(v)
    try {
      localStorage.setItem('vista-partita', v)
    } catch {
      // Preferenza non salvabile (navigazione privata): resta valida solo per questa partita.
    }
  }
  const orologioVisibile = fase === 'intervallo' ? 'Intervallo' : fase === 'fine' ? 'Finale' : `${Math.min(90, Math.floor(minuto) + 1)}'`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-emerald-900/40 to-slate-900 p-4">
          <div className="text-center text-xs tracking-wider text-slate-400 uppercase">
            Serie A · {giornata}ª giornata · {orologioVisibile}
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className={`truncate text-right text-lg font-black sm:text-2xl ${mia.casaId === carriera.clubUtente ? 'text-emerald-300' : ''}`}>
              {nomi[mia.casaId]}
            </div>
            <div className="rounded-xl bg-black/40 px-4 py-2 text-3xl font-black tabular-nums sm:text-4xl">
              {golCasa} - {golOspite}
            </div>
            <div className={`truncate text-lg font-black sm:text-2xl ${mia.ospiteId === carriera.clubUtente ? 'text-emerald-300' : ''}`}>
              {nomi[mia.ospiteId]}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-400" style={{ width: `${(minuto / 90) * 100}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            {RITMI.map((v) => (
              <button
                key={v.nome}
                type="button"
                onClick={() => setRitmo(v)}
                className={`rounded-full px-3 py-1 ${ritmo === v ? 'bg-white text-slate-900' : 'bg-white/10'}`}
              >
                {v.nome}
              </button>
            ))}
            {(fase === 'primo' || fase === 'secondo') && (
              <button type="button" onClick={salta} className="rounded-full bg-white/10 px-3 py-1">
                {fase === 'primo' ? "Vai all'intervallo" : 'Vai al fischio finale'}
              </button>
            )}
            {fase !== 'fine' && (
              <button type="button" onClick={() => onFine(anteprima)} className="rounded-full bg-white/10 px-3 py-1">
                Lascia finire al vice
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2 text-sm">
          {VISTE.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => scegliVista(v.id)}
              className={`rounded-lg px-3 py-1.5 ${vista === v.id ? 'bg-emerald-500 font-semibold text-emerald-950' : 'bg-white/10'}`}
            >
              {v.nome}
            </button>
          ))}
        </div>
        {vista === '2d' && (
          <div className="mt-3">
            <Campo2D scena={scena} tempo={orologio.tempo} divise={coloriSquadre} nomi={nomiGiocatori} />
          </div>
        )}
        {vista === '3d' && (
          <div className="mt-3">
            <Suspense fallback={<div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-slate-400">Carico lo stadio…</div>}>
              <Campo3D scena={scena} tempo={orologio.tempo} divise={coloriSquadre} nomi={nomiGiocatori} />
            </Suspense>
          </div>
        )}

        {fase === 'intervallo' && (
          <Intervallo
            xi1={xi1}
            bozza={bozza2}
            panchina={rosa(carriera, carriera.clubUtente)}
            modulo={modulo2}
            esclusi={esclusi2}
            nCambi={nCambi}
            onModulo={setModulo2}
            onEscludi={(id) => setEsclusi2(esclusi2.includes(id) ? esclusi2.filter((e) => e !== id) : [...esclusi2, id])}
            onRiprendi={() => {
              setSecondoTempo(nCambi > 0 ? bozza2 : undefined)
              setRipresa(true)
            }}
          />
        )}

        {fase === 'fine' && (
          <div className="mt-4 flex justify-center">
            <Bottone onClick={() => onFine(anteprima)}>Conferma e torna alla scrivania</Bottone>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">Cronaca</h2>
            <ol className="space-y-2 text-sm">
              {fase === 'fine' && <li className="font-semibold text-slate-300">90' Fischio finale.</li>}
              {segmento?.tipo === 'azione' && (
                <li className="animate-pulse font-semibold text-amber-200">
                  {Math.floor(minuto) + 1}' Azione pericolosa di {nomi[segmento.casa ? mia.casaId : mia.ospiteId]}…
                </li>
              )}
              {minuto > 45 && <li className="text-slate-400">46' Inizia il secondo tempo{secondoTempo ? ', con i cambi decisi negli spogliatoi' : ''}.</li>}
              {[...eventi].reverse().map((e, i) => (
                <RigaCronaca key={`${e.minuto}-${i}`} e={e} carriera={carriera} nomi={nomi} utente={e.clubId === carriera.clubUtente} />
              ))}
              <li className="text-slate-400">1' Calcio d'inizio.</li>
            </ol>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm">
              <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">Statistiche</h2>
              <Statistica nome="Possesso" casa={possesso(xiCasa, xiOspite)} ospite={100 - possesso(xiCasa, xiOspite)} percentuale />
              <Statistica nome="Tiri" casa={conta(mia.casaId, ['gol', 'parata', 'fuori', 'palo'])} ospite={conta(mia.ospiteId, ['gol', 'parata', 'fuori', 'palo'])} />
              <Statistica nome="Nello specchio" casa={conta(mia.casaId, ['gol', 'parata'])} ospite={conta(mia.ospiteId, ['gol', 'parata'])} />
              <Statistica nome="Ammonizioni" casa={conta(mia.casaId, ['giallo'])} ospite={conta(mia.ospiteId, ['giallo'])} />
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm">
              <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">Dagli altri campi</h2>
              <ul className="space-y-1">
                {partite
                  .filter((p) => !stessa(p, mia))
                  .map((p) => {
                    const [c, o] = punteggio(p)
                    return (
                      <li key={`${p.casaId}-${p.ospiteId}`} className="grid grid-cols-[1fr_auto_1fr] gap-2">
                        <span className="truncate text-right">{nomi[p.casaId]}</span>
                        <span className="w-12 rounded bg-white/5 text-center tabular-nums">
                          {c}-{o}
                        </span>
                        <span className="truncate">{nomi[p.ospiteId]}</span>
                      </li>
                    )
                  })}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function RigaCronaca({ e, carriera, nomi, utente }: { e: Evento; carriera: Carriera; nomi: Record<string, string>; utente: boolean }) {
  const nome = (id: string | null | undefined) => (id ? (carriera.giocatori[id]?.nome ?? '?') : '')
  const tipo = tipoEvento(e)
  const testo = {
    gol: `${nome(e.marcatoreId)} segna per ${nomi[e.clubId]}${e.assistId ? `, assist di ${nome(e.assistId)}` : ''}.`,
    parata: `${nome(e.marcatoreId)} calcia in porta, para ${nome(e.portiereId)}.`,
    fuori: `${nome(e.marcatoreId)} ci prova, palla fuori.`,
    palo: `${nome(e.marcatoreId)} colpisce il palo!`,
    giallo: `Ammonito ${nome(e.marcatoreId)} (${nomi[e.clubId]}).`,
  }[tipo]
  const etichetta = ETICHETTA[tipo]
  return (
    <li className={`flex items-start gap-2 ${tipo === 'gol' ? 'font-semibold' : ''}`}>
      <span className="w-8 shrink-0 text-right text-slate-500 tabular-nums">{e.minuto}'</span>
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${etichetta.stile}`}>{etichetta.testo}</span>
      <span className={utente ? 'text-slate-100' : 'text-slate-300'}>{testo}</span>
    </li>
  )
}

function Statistica({ nome, casa, ospite, percentuale = false }: { nome: string; casa: number; ospite: number; percentuale?: boolean }) {
  const totale = casa + ospite || 1
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs">
        <span className="font-semibold tabular-nums">{casa}{percentuale ? '%' : ''}</span>
        <span className="text-slate-400">{nome}</span>
        <span className="font-semibold tabular-nums">{ospite}{percentuale ? '%' : ''}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="bg-emerald-400" style={{ width: `${(casa / totale) * 100}%` }} />
        <div className="ml-auto bg-sky-400" style={{ width: `${(ospite / totale) * 100}%` }} />
      </div>
    </div>
  )
}

function Intervallo({
  xi1,
  bozza,
  panchina,
  modulo,
  esclusi,
  nCambi,
  onModulo,
  onEscludi,
  onRiprendi,
}: {
  xi1: Giocatore[]
  bozza: Giocatore[]
  panchina: Giocatore[]
  modulo: Modulo
  esclusi: string[]
  nCambi: number
  onModulo: (m: Modulo) => void
  onEscludi: (id: string) => void
  onRiprendi: () => void
}) {
  const fuori = panchina.filter((g) => !bozza.includes(g)).sort((a, b) => b.overall - a.overall)
  const troppi = nCambi > MAX_CAMBI
  return (
    <section className="mt-4 rounded-xl border border-emerald-400/30 bg-slate-900 p-4">
      <h2 className="text-lg font-bold">Intervallo: parla alla squadra</h2>
      <p className="mt-1 text-sm text-slate-400">
        Cambia modulo o togli qualcuno: il vice sceglie il migliore sostituto per ruolo. Al massimo {MAX_CAMBI} cambi.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(MODULI) as Modulo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModulo(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${modulo === m ? 'bg-emerald-500 text-emerald-950' : 'bg-white/10'}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">In campo nel secondo tempo</h3>
          <ul className="space-y-1">
            {bozza.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <Overall valore={g.overall} />
                <span className="w-8 text-xs text-slate-500">{RUOLO_BREVE[g.ruolo]}</span>
                <span className="flex-1 truncate">
                  {g.nome}
                  {!xi1.includes(g) && <span className="ml-1 text-xs text-emerald-300">entra</span>}
                </span>
                <button type="button" onClick={() => onEscludi(g.id)} className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10">
                  Togli
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">Fuori</h3>
          <ul className="space-y-1">
            {fuori.map((g) => (
              <li key={g.id} className={`flex items-center gap-2 text-sm ${esclusi.includes(g.id) ? 'opacity-50' : ''}`}>
                <Overall valore={g.overall} />
                <span className="w-8 text-xs text-slate-500">{RUOLO_BREVE[g.ruolo]}</span>
                <span className="flex-1 truncate">
                  {g.nome}
                  {xi1.includes(g) && <span className="ml-1 text-xs text-rose-300">esce</span>}
                </span>
                {esclusi.includes(g.id) && (
                  <button type="button" onClick={() => onEscludi(g.id)} className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10">
                    Rimetti
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Bottone onClick={onRiprendi} disabled={troppi}>
          Riprendi il secondo tempo
        </Bottone>
        <span className={`text-sm ${troppi ? 'text-rose-300' : 'text-slate-400'}`}>
          Cambi: {nCambi}/{MAX_CAMBI}
        </span>
      </div>
    </section>
  )
}
