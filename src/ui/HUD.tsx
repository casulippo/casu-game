import { useGame } from '../store'
import { faseGiorno, formattaOra } from '../engine/time'

const ETICHETTE_FASE: Record<string, string> = {
  notte: 'Notte',
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
}

function Riquadro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-800/80 px-3 py-2 ring-1 ring-slate-700">
      <div className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="font-mono text-lg text-slate-100 tabular-nums">{value}</div>
    </div>
  )
}

/**
 * La HUD legge dallo store e si aggiorna da sola.
 *
 * Non sa nulla di Phaser: sa solo che il tempo cambia. È la prova che i tre
 * strati comunicano solo attraverso lo store.
 */
export function HUD() {
  const tempo = useGame((s) => s.tempo)
  const giocatore = useGame((s) => s.giocatore)
  const quartiere = useGame((s) => s.quartiereCorrente)

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <Riquadro label="Giorno" value={String(tempo.giorno)} />
      <Riquadro label="Ora" value={formattaOra(tempo)} />
      <Riquadro label="Fase" value={ETICHETTE_FASE[faseGiorno(tempo)]} />
      <Riquadro label="Età" value={`${giocatore.eta} anni`} />
      <Riquadro label="Puliti" value={`${giocatore.soldiPuliti} €`} />
      <Riquadro label="Sporchi" value={`${giocatore.soldiSporchi} €`} />
      <Riquadro label="Quartiere" value={quartiere} />
    </div>
  )
}
