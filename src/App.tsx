import { useEffect, useState, type ReactNode } from 'react'
import { caricaMondo } from './data/caricaSeed'
import { caricaCarriera, eliminaCarriera, esportaCarriera, leggiFileCarriera, salvaCarriera } from './data/salvataggi'
import type { Mondo } from './data/seed'
import { giocaGiornata, nuovaCarriera, nuovaStagione, prossimaGiornata, simulaFinoAllaFine } from './engine/carriera'
import type { Carriera, Giocatore } from './engine/tipi'
import { Calendario, RigaPartita } from './ui/Calendario'
import { Classifica } from './ui/Classifica'
import { Bottone, Modale } from './ui/comuni'
import { Opzioni } from './ui/Opzioni'
import { Panoramica } from './ui/Panoramica'
import { Rosa } from './ui/Rosa'
import { SceltaClub } from './ui/SceltaClub'
import { SchedaGiocatore } from './ui/SchedaGiocatore'

type Schermata = 'avvio' | 'menu' | 'scelta' | 'gioco'
type Scheda = 'panoramica' | 'rosa' | 'classifica' | 'calendario' | 'opzioni'

const SCHEDE: { id: Scheda; nome: string; icona: string }[] = [
  { id: 'panoramica', nome: 'Home', icona: '⌂' },
  { id: 'rosa', nome: 'Rosa', icona: '☰' },
  { id: 'classifica', nome: 'Classifica', icona: '≡' },
  { id: 'calendario', nome: 'Calendario', icona: '▦' },
  { id: 'opzioni', nome: 'Opzioni', icona: '⚙' },
]

export default function App() {
  const [schermata, setSchermata] = useState<Schermata>('avvio')
  const [salvata, setSalvata] = useState<Carriera>()
  const [carriera, setCarriera] = useState<Carriera>()
  const [mondo, setMondo] = useState<Mondo>()
  const [scheda, setScheda] = useState<Scheda>('panoramica')
  const [errore, setErrore] = useState<string>()
  const [caricando, setCaricando] = useState(false)
  const [aperto, setAperto] = useState<Giocatore>()
  const [clubAperto, setClubAperto] = useState<string>()
  const [giornataGiocata, setGiornataGiocata] = useState<number>()

  useEffect(() => {
    caricaCarriera()
      .then(setSalvata)
      .catch(() => setErrore('Impossibile leggere i salvataggi del browser'))
      .finally(() => setSchermata('menu'))
  }, [])

  const aggiorna = (c: Carriera) => {
    setCarriera(c)
    setSalvata(c)
    salvaCarriera(c).catch(() => setErrore('Salvataggio non riuscito: esporta un file per sicurezza'))
  }

  const avviaNuova = async () => {
    setErrore(undefined)
    if (!mondo) {
      setCaricando(true)
      try {
        setMondo(await caricaMondo())
      } catch (e) {
        setErrore(e instanceof Error ? e.message : 'Caricamento dei dati non riuscito')
        return
      } finally {
        setCaricando(false)
      }
    }
    setSchermata('scelta')
  }

  const importa = async (f: File) => {
    try {
      const c = await leggiFileCarriera(f)
      aggiorna(c)
      setScheda('panoramica')
      setSchermata('gioco')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'File non valido')
    }
  }

  if (schermata === 'avvio') return <Sfondo />

  if (schermata === 'scelta' && mondo)
    return (
      <Sfondo>
        <SceltaClub
          mondo={mondo}
          onIndietro={() => setSchermata('menu')}
          onScegli={(id) => {
            aggiorna(nuovaCarriera(mondo.club, mondo.giocatori, id, mondo.stagione, crypto.randomUUID()))
            setScheda('panoramica')
            setSchermata('gioco')
          }}
        />
      </Sfondo>
    )

  if (schermata === 'menu' || !carriera)
    return (
      <Sfondo>
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
          <div>
            <div className="text-sm font-semibold tracking-[0.3em] text-emerald-400 uppercase">Casu</div>
            <h1 className="text-4xl font-black">Manager</h1>
            <p className="mt-2 text-slate-400">Allena una squadra di Serie A con rose, contratti e stipendi reali della stagione 2026-27.</p>
          </div>
          {errore && <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">{errore}</p>}
          <div className="flex flex-col gap-3">
            {salvata && (
              <button
                type="button"
                onClick={() => {
                  setCarriera(salvata)
                  setScheda('panoramica')
                  setSchermata('gioco')
                }}
                className="rounded-xl bg-emerald-500 px-5 py-4 text-left text-emerald-950 transition hover:bg-emerald-400"
              >
                <div className="font-bold">Continua</div>
                <div className="text-sm opacity-80">
                  {salvata.club.find((c) => c.id === salvata.clubUtente)?.nome} · {salvata.stagione} ·{' '}
                  {prossimaGiornata(salvata) ? `${prossimaGiornata(salvata)}ª giornata` : 'stagione conclusa'}
                </div>
              </button>
            )}
            <Bottone variante={salvata ? 'secondario' : 'primario'} onClick={avviaNuova} disabled={caricando}>
              {caricando ? 'Carico i dati…' : 'Nuova carriera'}
            </Bottone>
            {salvata && <p className="text-xs text-slate-500">Una nuova carriera sostituisce quella salvata: esportala prima se vuoi tenerla.</p>}
            <label className="cursor-pointer text-center text-sm text-slate-400 hover:text-slate-200">
              Importa un salvataggio
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importa(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      </Sfondo>
    )

  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const oggi = `${carriera.stagione.slice(0, 4)}-09-01`
  const giornata = prossimaGiornata(carriera)

  return (
    <Sfondo>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-black">{nomi[carriera.clubUtente]}</div>
            <div className="text-xs text-slate-400">
              Serie A {carriera.stagione} · {giornata ? `${giornata}ª giornata` : 'stagione conclusa'}
            </div>
          </div>
          <nav className="hidden gap-1 md:flex">
            {SCHEDE.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScheda(s.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${scheda === s.id ? 'bg-white/15 font-semibold' : 'text-slate-400 hover:bg-white/5'}`}
              >
                {s.nome}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4 pb-28 md:pb-10">
        {errore && (
          <p className="mb-4 flex justify-between rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
            {errore}
            <button type="button" onClick={() => setErrore(undefined)}>
              ✕
            </button>
          </p>
        )}
        {scheda === 'panoramica' && (
          <Panoramica
            carriera={carriera}
            onApri={setAperto}
            onVaiClassifica={() => setScheda('classifica')}
            onGioca={() => {
              setGiornataGiocata(prossimaGiornata(carriera) ?? undefined)
              aggiorna(giocaGiornata(carriera))
            }}
            onSimulaTutto={() => aggiorna(simulaFinoAllaFine(carriera))}
            onNuovaStagione={() => aggiorna(nuovaStagione(carriera))}
          />
        )}
        {scheda === 'rosa' && <Rosa carriera={carriera} clubId={carriera.clubUtente} oggi={oggi} onApri={setAperto} onCambia={aggiorna} />}
        {scheda === 'classifica' && <Classifica carriera={carriera} onApriClub={setClubAperto} />}
        {scheda === 'calendario' && <Calendario carriera={carriera} />}
        {scheda === 'opzioni' && (
          <Opzioni
            carriera={carriera}
            onEsporta={() => esportaCarriera(carriera, nomi[carriera.clubUtente])}
            onImporta={importa}
            onMenu={() => setSchermata('menu')}
            onElimina={async () => {
              await eliminaCarriera()
              setSalvata(undefined)
              setCarriera(undefined)
              setSchermata('menu')
            }}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {SCHEDE.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScheda(s.id)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${scheda === s.id ? 'text-emerald-300' : 'text-slate-400'}`}
          >
            <span className="text-lg leading-none">{s.icona}</span>
            {s.nome}
          </button>
        ))}
      </nav>

      {giornataGiocata !== undefined && (
        <Modale titolo={`Risultati · ${giornataGiocata}ª giornata`} onChiudi={() => setGiornataGiocata(undefined)}>
          <div className="divide-y divide-white/5">
            {carriera.calendario
              .filter((p) => p.giornata === giornataGiocata)
              .sort((a, b) => Number(b.casaId === carriera.clubUtente || b.ospiteId === carriera.clubUtente) - Number(a.casaId === carriera.clubUtente || a.ospiteId === carriera.clubUtente))
              .map((p) => (
                <RigaPartita key={`${p.casaId}-${p.ospiteId}`} p={p} carriera={carriera} dettaglio />
              ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Bottone onClick={() => setGiornataGiocata(undefined)}>Continua</Bottone>
          </div>
        </Modale>
      )}

      {clubAperto && (
        <Modale titolo={nomi[clubAperto]} onChiudi={() => setClubAperto(undefined)}>
          <Rosa carriera={carriera} clubId={clubAperto} oggi={oggi} onApri={setAperto} />
        </Modale>
      )}

      {aperto && <SchedaGiocatore g={carriera.giocatori[aperto.id] ?? aperto} nomeClub={nomi[aperto.clubId]} oggi={oggi} onChiudi={() => setAperto(undefined)} />}
    </Sfondo>
  )
}

function Sfondo({ children }: { children?: ReactNode }) {
  return <div className="min-h-dvh bg-slate-950 text-slate-100 antialiased">{children}</div>
}
