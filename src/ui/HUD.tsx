import { useGame } from '../store'
import { faseGiorno, formattaOra } from '../engine/time'
import { luogoPerId } from '../engine/luoghi'

const ETICHETTE_FASE: Record<string, string> = {
  notte: 'Notte',
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
}

function Riquadro({
  label,
  value,
  soloDesktop = false,
}: {
  label: string
  value: string
  /** Su telefono lo spazio è poco: alcuni dati compaiono solo da tablet in su. */
  soloDesktop?: boolean
}) {
  return (
    <div
      className={`rounded-md bg-slate-900/75 px-2 py-1 ring-1 ring-slate-700/80 backdrop-blur-sm sm:px-3 sm:py-2 ${
        soloDesktop ? 'hidden sm:block' : ''
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
        {label}
      </div>
      <div className="font-mono text-sm text-slate-100 tabular-nums sm:text-lg">
        {value}
      </div>
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
  const luogoCorrente = useGame((s) => s.luogoCorrente)

  const dove = luogoCorrente ? nomeLuogo(luogoCorrente) : quartiere

  return (
    <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">
      <Riquadro label="Giorno" value={String(tempo.giorno)} />
      <Riquadro label="Ora" value={formattaOra(tempo)} />
      <Riquadro label="Fase" value={ETICHETTE_FASE[faseGiorno(tempo)]} />
      <Riquadro label="Dove" value={dove} />
      <Riquadro label="Puliti" value={`${giocatore.soldiPuliti} €`} soloDesktop />
      <Riquadro label="Età" value={`${giocatore.eta} anni`} soloDesktop />
      <Riquadro label="Sporchi" value={`${giocatore.soldiSporchi} €`} soloDesktop />
    </div>
  )
}

function nomeLuogo(id: string): string {
  try {
    return luogoPerId(id).nome
  } catch {
    return id
  }
}
