import { Fragment, lazy, Suspense, useMemo, useState } from 'react'
import { cambi, giocaGiornata, MAX_CAMBI, prossimaGiornata, rosa, xiDi } from '../engine/carriera'
import { formazione, giocaPartita, xiAlMinuto, type Fase as FaseGioco } from '../engine/partita'
import { MODULI, tipoEvento, type Carriera, type Evento, type Giocatore, type Modulo, type Partita } from '../engine/tipi'
import { Campo2D } from './campo/Campo2D'
import { divise } from './campo/colori'
import { useOrologio } from './campo/orologio'
import { creaScena, salienteA } from './campo/scena'
import { Bottone, Overall } from './comuni'
import { RUOLO_BREVE } from './formato'

const Campo3D = lazy(() => import('./campo/Campo3D'))

type Fase = 'primo' | 'intervallo' | 'secondo' | 'fine'
type Vista = '2d' | '3d' | 'cronaca'

// Secondi reali per minuto di gioco: nelle azioni salienti il tempo rallenta per seguirle.
const RITMI = [
  { nome: 'Lenta', gioco: 4, azione: 35 },
  { nome: 'Normale', gioco: 2.5, azione: 22 },
  { nome: 'Veloce', gioco: 0.8, azione: 10 },
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
  // Tattica in vigore e bozza in modifica nel pannello cambi.
  const [modulo, setModulo] = useState<Modulo>(carriera.modulo)
  const [esclusi, setEsclusi] = useState<string[]>(carriera.esclusi)
  const [bozzaModulo, setBozzaModulo] = useState<Modulo>(carriera.modulo)
  const [bozzaEsclusi, setBozzaEsclusi] = useState<string[]>(carriera.esclusi)
  const [pannello, setPannello] = useState(false)
  const [fasi, setFasi] = useState<FaseGioco[]>([])

  const dati = useMemo(() => {
    const mia = carriera.calendario.find(
      (p) => p.giornata === giornata && (p.casaId === carriera.clubUtente || p.ospiteId === carriera.clubUtente),
    )!
    const avversario = mia.casaId === carriera.clubUtente ? mia.ospiteId : mia.casaId
    const xi1 = xiDi(carriera, carriera.clubUtente)
    const xiAvversario = xiDi(carriera, avversario)
    const anteprima = giocaGiornata(carriera, fasi.length ? fasi : undefined)
    const partite = anteprima.calendario.filter((p) => p.giornata === giornata)
    const partitaMia = partite.find((p) => stessa(p, mia))!
    const inCasa = mia.casaId === carriera.clubUtente
    // Stessi ingressi di giocaGiornata: la partita che guardi è esattamente quella che verrà salvata.
    const sim = giocaPartita(
      mia,
      inCasa ? xi1 : xiAvversario,
      inCasa ? xiAvversario : xi1,
      `${carriera.seme}:${carriera.stagione}`,
      inCasa ? { casa: fasi } : { ospite: fasi },
    )
    const mie = { base: xi1, fasi }
    const loro = { base: xiAvversario, fasi: [] }
    const scena = creaScena(sim, { casa: inCasa ? mie : loro, ospite: inCasa ? loro : mie })
    return { mia, xi1, xiAvversario, anteprima, partite, partitaMia, sim, scena, colori: divise(mia.casaId, mia.ospiteId) }
  }, [carriera, giornata, fasi])
  const { mia, xi1, anteprima, partite, partitaMia, sim, scena, colori: coloriSquadre } = dati

  const orologio = useOrologio(ripresa ? 90 : 45, pannello, (t) => {
    if (vista === 'cronaca') return salienteA(scena, t) ? ritmo.gioco * 3 : ritmo.gioco
    if (salienteA(scena, t)) return ritmo.azione
    // Frenata progressiva nell'ultimo mezzo minuto prima di un'azione.
    const prossima = scena.salienti.find((s) => s.inizio > t)
    const k = prossima ? Math.min(1, Math.max(0, 1 - (prossima.inizio - t) / 0.5)) : 0
    return ritmo.gioco ** (1 - k) * ritmo.azione ** k
  })
  const minuto = orologio.t
  const fase: Fase = minuto < 45 ? 'primo' : !ripresa ? 'intervallo' : minuto < 90 ? 'secondo' : 'fine'
  const momento = (e: Evento) => e.t ?? e.minuto
  const eventi = (partitaMia.eventi ?? []).filter((e) => momento(e) <= minuto)

  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const nomiGiocatori = Object.fromEntries(Object.values(carriera.giocatori).map((g) => [g.id, g.nome]))

  // Minuto da cui vale un cambio: all'intervallo il 46°, in partita quello dopo il minuto in corso.
  const daMinuto = fase === 'intervallo' ? 46 : Math.floor(minuto) + 2
  const minutoInCorso = Math.min(90, Math.floor(minuto) + 1)
  const xiAttuale = xiAlMinuto(xi1, fasi, fase === 'intervallo' ? 46 : minutoInCorso)
  // Chi è uscito non può rientrare, come da regolamento.
  const usciti = [...new Set([xi1, ...fasi.map((f) => f.xi)].flat())].filter((g) => !xiAttuale.includes(g)).map((g) => g.id)
  const bozza = formazione(rosa(carriera, carriera.clubUtente), bozzaModulo, [...bozzaEsclusi, ...usciti])
  const nCambiFatti = cambi(xi1, fasi.map((f) => f.xi))
  const nCambi = cambi(xi1, [...fasi.map((f) => f.xi), bozza])
  const bozzaDiversa = bozza.length !== xiAttuale.length || bozza.some((g) => !xiAttuale.includes(g))

  const apriCambi = () => {
    setBozzaModulo(modulo)
    setBozzaEsclusi(esclusi)
    setPannello(true)
  }
  const applicaCambi = () => {
    if (bozzaDiversa && daMinuto <= 90) setFasi([...fasi, { da: daMinuto, xi: bozza }])
    setModulo(bozzaModulo)
    setEsclusi(bozzaEsclusi)
    setPannello(false)
    if (fase === 'intervallo') setRipresa(true)
  }

  const punteggio = (p: Partita) => {
    const fino = (p.eventi ?? []).filter((e) => (p === partitaMia ? momento(e) : e.minuto) <= minuto && tipoEvento(e) === 'gol')
    return [fino.filter((e) => e.clubId === p.casaId).length, fino.filter((e) => e.clubId === p.ospiteId).length]
  }
  const [golCasa, golOspite] = punteggio(partitaMia)
  // Statistiche dai tocchi giocati fin qui.
  const giocati = sim.tocchi.filter((x) => x.t0 < minuto)
  const tempoCasa = giocati.filter((x) => x.casa).reduce((a, x) => a + Math.min(x.t1, minuto) - x.t0, 0)
  const tempoTotale = giocati.reduce((a, x) => a + Math.min(x.t1, minuto) - x.t0, 0)
  const possessoCasa = tempoTotale > 0 ? Math.round((tempoCasa / tempoTotale) * 100) : 50
  const passaggi = (casa: boolean) => giocati.filter((x) => x.casa === casa && x.t1 <= minuto && (x.tipo === 'passaggio' || x.tipo === 'rinvio'))
  const precisione = (casa: boolean) => {
    const p = passaggi(casa)
    return p.length ? Math.round((p.filter((x) => x.esito === 'ok').length / p.length) * 100) : 0
  }
  const conta = (clubId: string, tipi: string[]) => eventi.filter((e) => e.clubId === clubId && tipi.includes(tipoEvento(e))).length
  const azioneInCorso = salienteA(scena, minuto)

  // Cronaca: eventi di gioco e sostituzioni, dal più recente.
  const cronaca = [
    ...eventi.map((e) => ({ t: momento(e), chiave: `e-${e.minuto}-${e.marcatoreId}-${e.tipo}`, el: <RigaCronaca e={e} carriera={carriera} nomi={nomi} utente={e.clubId === carriera.clubUtente} /> })),
    ...fasi
      .filter((f) => f.da - 1 <= minuto)
      .map((f, i) => {
        const prima = i === 0 ? xi1 : fasi[i - 1].xi
        const entrati = f.xi.filter((g) => !prima.includes(g)).map((g) => g.nome)
        const fuori = prima.filter((g) => !f.xi.includes(g)).map((g) => g.nome)
        return {
          t: f.da - 1,
          chiave: `f-${f.da}-${i}`,
          el: (
            <li className="flex items-start gap-2">
              <span className="w-8 shrink-0 text-right text-slate-500 tabular-nums">{f.da}'</span>
              <span className="shrink-0 rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">CAMBIO</span>
              <span className="text-slate-100">
                {entrati.length ? `Entra ${entrati.join(', ')}, esce ${fuori.join(', ')}.` : `${nomi[carriera.clubUtente]} cambia modulo.`}
              </span>
            </li>
          ),
        }
      }),
  ].sort((a, b) => b.t - a.t)

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
            {(fase === 'primo' || fase === 'secondo') && !pannello && daMinuto <= 90 && (
              <button type="button" onClick={apriCambi} className="rounded-full bg-emerald-500 px-3 py-1 font-semibold text-emerald-950">
                Cambi e tattica ({nCambiFatti}/{MAX_CAMBI})
              </button>
            )}
            {(fase === 'primo' || fase === 'secondo') && !pannello && (
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
            <Campo2D scena={scena} tempo={orologio.tempo} ritmo={orologio.ritmo} divise={coloriSquadre} nomi={nomiGiocatori} />
          </div>
        )}
        {vista === '3d' && (
          <div className="mt-3">
            <Suspense fallback={<div className="flex aspect-video items-center justify-center rounded-xl bg-slate-900 text-slate-400">Carico lo stadio…</div>}>
              <Campo3D scena={scena} tempo={orologio.tempo} ritmo={orologio.ritmo} divise={coloriSquadre} nomi={nomiGiocatori} />
            </Suspense>
          </div>
        )}

        {(fase === 'intervallo' || pannello) && (
          <PannelloCambi
            titolo={fase === 'intervallo' ? 'Intervallo: parla alla squadra' : `Cambi e tattica · dal ${daMinuto}'`}
            inCampo={xiAttuale}
            bozza={bozza}
            rosa={rosa(carriera, carriera.clubUtente)}
            modulo={bozzaModulo}
            esclusi={bozzaEsclusi}
            usciti={usciti}
            nCambi={nCambi}
            onModulo={setBozzaModulo}
            onEscludi={(id) => setBozzaEsclusi(bozzaEsclusi.includes(id) ? bozzaEsclusi.filter((e) => e !== id) : [...bozzaEsclusi, id])}
            conferma={fase === 'intervallo' ? 'Riprendi il secondo tempo' : 'Conferma e riprendi'}
            onConferma={applicaCambi}
            onAnnulla={fase === 'intervallo' ? undefined : () => setPannello(false)}
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
              {azioneInCorso && minuto < azioneInCorso.tiro && (
                <li className="animate-pulse font-semibold text-amber-200">
                  {Math.floor(minuto) + 1}' Azione pericolosa di {nomi[azioneInCorso.casa ? mia.casaId : mia.ospiteId]}…
                </li>
              )}
              {cronaca
                .filter((c) => c.t >= 45)
                .map((c) => (
                  <Fragment key={c.chiave}>{c.el}</Fragment>
                ))}
              {minuto > 45 && <li className="text-slate-400">46' Inizia il secondo tempo.</li>}
              {cronaca
                .filter((c) => c.t < 45)
                .map((c) => (
                  <Fragment key={c.chiave}>{c.el}</Fragment>
                ))}
              <li className="text-slate-400">1' Calcio d'inizio.</li>
            </ol>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm">
              <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase">Statistiche</h2>
              <Statistica nome="Possesso" casa={possessoCasa} ospite={100 - possessoCasa} percentuale />
              <Statistica nome="Passaggi riusciti" casa={precisione(true)} ospite={precisione(false)} percentuale />
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

function PannelloCambi({
  titolo,
  inCampo,
  bozza,
  rosa,
  modulo,
  esclusi,
  usciti,
  nCambi,
  onModulo,
  onEscludi,
  conferma,
  onConferma,
  onAnnulla,
}: {
  titolo: string
  inCampo: Giocatore[]
  bozza: Giocatore[]
  rosa: Giocatore[]
  modulo: Modulo
  esclusi: string[]
  usciti: string[]
  nCambi: number
  onModulo: (m: Modulo) => void
  onEscludi: (id: string) => void
  conferma: string
  onConferma: () => void
  onAnnulla?: () => void
}) {
  const fuori = rosa.filter((g) => !bozza.includes(g)).sort((a, b) => b.overall - a.overall)
  const troppi = nCambi > MAX_CAMBI
  return (
    <section className="mt-4 rounded-xl border border-emerald-400/30 bg-slate-900 p-4">
      <h2 className="text-lg font-bold">{titolo}</h2>
      <p className="mt-1 text-sm text-slate-400">
        Cambia modulo o togli qualcuno: il vice sceglie il migliore sostituto per ruolo. Al massimo {MAX_CAMBI} cambi, e chi esce non rientra.
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
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">In campo</h3>
          <ul className="space-y-1">
            {bozza.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <Overall valore={g.overall} />
                <span className="w-8 text-xs text-slate-500">{RUOLO_BREVE[g.ruolo]}</span>
                <span className="flex-1 truncate">
                  {g.nome}
                  {!inCampo.includes(g) && <span className="ml-1 text-xs text-emerald-300">entra</span>}
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
            {fuori.map((g) => {
              const uscito = usciti.includes(g.id)
              return (
                <li key={g.id} className={`flex items-center gap-2 text-sm ${esclusi.includes(g.id) || uscito ? 'opacity-50' : ''}`}>
                  <Overall valore={g.overall} />
                  <span className="w-8 text-xs text-slate-500">{RUOLO_BREVE[g.ruolo]}</span>
                  <span className="flex-1 truncate">
                    {g.nome}
                    {inCampo.includes(g) && <span className="ml-1 text-xs text-rose-300">esce</span>}
                    {uscito && <span className="ml-1 text-xs text-slate-500">già uscito</span>}
                  </span>
                  {esclusi.includes(g.id) && !uscito && (
                    <button type="button" onClick={() => onEscludi(g.id)} className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10">
                      Rimetti
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Bottone onClick={onConferma} disabled={troppi}>
          {conferma}
        </Bottone>
        {onAnnulla && (
          <Bottone variante="secondario" onClick={onAnnulla}>
            Annulla
          </Bottone>
        )}
        <span className={`text-sm ${troppi ? 'text-rose-300' : 'text-slate-400'}`}>
          Cambi: {nCambi}/{MAX_CAMBI}
        </span>
      </div>
    </section>
  )
}
