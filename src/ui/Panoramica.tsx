import { classifica } from '../engine/classifica'
import { prossimaGiornata, ultimaGiornata, xiDi } from '../engine/carriera'
import { forza } from '../engine/partita'
import type { Carriera, Giocatore } from '../engine/tipi'
import { RigaPartita } from './Calendario'
import { Classifica } from './Classifica'
import { Bottone, Card } from './comuni'

export function Panoramica({
  carriera,
  onGioca,
  onSimulaTutto,
  onNuovaStagione,
  onApri,
  onVaiClassifica,
}: {
  carriera: Carriera
  onGioca: () => void
  onSimulaTutto: () => void
  onNuovaStagione: () => void
  onApri: (g: Giocatore) => void
  onVaiClassifica: () => void
}) {
  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const giornata = prossimaGiornata(carriera)
  const mie = carriera.calendario.filter((p) => p.casaId === carriera.clubUtente || p.ospiteId === carriera.clubUtente)
  const prossima = mie.find((p) => p.giornata === giornata)
  const ultima = [...mie].reverse().find((p) => p.golCasa !== undefined)
  const tabella = classifica(carriera.club.map((c) => c.id), carriera.calendario)
  const posizione = tabella.findIndex((r) => r.clubId === carriera.clubUtente) + 1

  const marcatori = Object.values(carriera.giocatori)
    .filter((g) => g.stagione.gol > 0)
    .sort((a, b) => b.stagione.gol - a.stagione.gol || b.stagione.assist - a.stagione.assist)
    .slice(0, 5)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {prossima && giornata !== null ? (
          <Card titolo={`Prossima partita · ${giornata}ª giornata di ${ultimaGiornata(carriera)}`}>
            <Sfida carriera={carriera} casaId={prossima.casaId} ospiteId={prossima.ospiteId} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Bottone onClick={onGioca}>Gioca giornata</Bottone>
              <Bottone variante="secondario" onClick={onSimulaTutto}>
                Simula fino a fine stagione
              </Bottone>
            </div>
          </Card>
        ) : (
          <Card titolo={`Stagione ${carriera.stagione} conclusa`}>
            <p className="text-lg">
              Hai chiuso <strong>{posizione}°</strong> con <strong>{tabella[posizione - 1].punti} punti</strong>.
            </p>
            <p className="mt-1 text-slate-400">
              Campione d'Italia: <strong className="text-slate-100">{nomi[tabella[0].clubId]}</strong>
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Nella nuova stagione i giocatori invecchiano: i giovani che hanno giocato crescono, i più anziani calano. I contratti in
              scadenza si rinnovano da soli finché non arriva il mercato.
            </p>
            <div className="mt-4">
              <Bottone onClick={onNuovaStagione}>Inizia la stagione successiva</Bottone>
            </div>
          </Card>
        )}

        {ultima && (
          <Card titolo={`Ultima partita · ${ultima.giornata}ª giornata`}>
            <RigaPartita p={ultima} carriera={carriera} dettaglio />
          </Card>
        )}

        {marcatori.length > 0 && (
          <Card titolo="Capocannonieri">
            <ul className="space-y-1 text-sm">
              {marcatori.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={() => onApri(g)} className="flex w-full items-center justify-between rounded px-1 py-0.5 text-left hover:bg-white/5">
                    <span className={g.clubId === carriera.clubUtente ? 'font-semibold text-emerald-300' : ''}>
                      {g.nome} <span className="text-slate-500">· {nomi[g.clubId]}</span>
                    </span>
                    <span className="font-bold tabular-nums">{g.stagione.gol}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card
          titolo="Classifica"
          azione={
            <button type="button" onClick={onVaiClassifica} className="text-xs text-emerald-300 hover:underline">
              Completa ›
            </button>
          }
        >
          <Classifica carriera={carriera} compatta />
        </Card>

        {carriera.storico.length > 0 && (
          <Card titolo="Albo della carriera">
            <ul className="space-y-1 text-sm">
              {[...carriera.storico].reverse().map((s) => (
                <li key={s.stagione} className="flex justify-between">
                  <span>{s.stagione}</span>
                  <span className="text-slate-400">
                    {s.posizioneUtente}° · {s.puntiUtente} pt · campione {nomi[s.campioneId]}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  )
}

function Sfida({ carriera, casaId, ospiteId }: { carriera: Carriera; casaId: string; ospiteId: string }) {
  const nomi = Object.fromEntries(carriera.club.map((c) => [c.id, c.nome]))
  const lato = (id: string) => {
    const f = forza(xiDi(carriera, id))
    return (
      <div className={`flex-1 ${id === casaId ? 'text-left' : 'text-right'}`}>
        <div className={`text-lg font-bold ${id === carriera.clubUtente ? 'text-emerald-300' : ''}`}>{nomi[id]}</div>
        <div className="text-xs text-slate-400">
          Attacco {Math.round(f.attacco)} · Difesa {Math.round(f.difesa)}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3">
      {lato(casaId)}
      <span className="text-sm text-slate-500">vs</span>
      {lato(ospiteId)}
    </div>
  )
}
