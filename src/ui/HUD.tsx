import { useGame } from '../store'
import { faseGiorno, formattaOra } from '../engine/time'
import { luogoPerId } from '../engine/luoghi'
import { grammiTotali } from '../engine/droga'
import { quartierePerId } from '../engine/quartieri'

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

/** Un riquadro su cui si può premere: stessa forma, mestiere diverso. */
function Bottone({
  label,
  value,
  azione,
  soloDesktop = false,
}: {
  label: string
  value: string
  azione: () => void
  soloDesktop?: boolean
}) {
  return (
    <button
      type="button"
      onClick={azione}
      className={`pointer-events-auto rounded-md bg-slate-900/75 px-2 py-1 text-left ring-1 ring-slate-700/80 backdrop-blur-sm transition active:scale-95 sm:px-3 sm:py-2 ${
        soloDesktop ? 'hidden sm:block' : ''
      }`}
    >
      <div className="text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
        {label}
      </div>
      <div className="font-mono text-sm text-slate-100 tabular-nums sm:text-lg">{value}</div>
    </button>
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
  const fame = useGame((s) => s.fame)
  const sonno = useGame((s) => s.sonno)
  const quartiere = useGame((s) => s.quartiereCorrente)
  const luogoCorrente = useGame((s) => s.luogoCorrente)
  const avanzaTempo = useGame((s) => s.avanzaTempo)
  const alternaMappa = useGame((s) => s.alternaMappa)
  const apriIntro = useGame((s) => s.apriIntro)

  const dove = luogoCorrente
    ? nomeLuogo(luogoCorrente)
    : quartierePerId(quartiere).nome

  return (
    <div className="flex flex-wrap items-stretch gap-1.5 sm:gap-2">
      <Riquadro label="Giorno" value={String(tempo.giorno)} />
      {/* Cliccabile per saltare avanti: il ciclo giorno/notte dura un'ora reale. */}
      <button
        type="button"
        onClick={() => avanzaTempo(2)}
        className="pointer-events-auto rounded-md bg-slate-900/75 px-2 py-1 text-left ring-1 ring-slate-700/80 backdrop-blur-sm transition active:scale-95 sm:px-3 sm:py-2"
        title="Avanza di 2 ore"
      >
        <div className="text-[9px] uppercase tracking-wider text-slate-400 sm:text-[10px]">
          Ora +2
        </div>
        <div className="font-mono text-sm text-slate-100 tabular-nums sm:text-lg">
          {formattaOra(tempo)}
        </div>
      </button>
      <Riquadro label="Fase" value={ETICHETTE_FASE[faseGiorno(tempo)]} />
      <Bottone label="Mappa" value="M" azione={alternaMappa} />
      <Bottone label="Aiuto" value="?" azione={apriIntro} soloDesktop />
      <Riquadro label="Dove" value={dove} />
      <Riquadro label="Fame" value={`${Math.round(fame.livello)}%`} />
      <Riquadro label="Sonno" value={debitoLeggibile(sonno.debito)} soloDesktop />
      <Riquadro label="Contante" value={`${Math.round(giocatore.contante)} €`} />
      <Riquadro label="Livello" value={String(giocatore.livello)} soloDesktop />
      {grammiTotali(giocatore.roba) > 0 && (
        <Riquadro label="Roba" value={`${grammiTotali(giocatore.roba)} g`} />
      )}
      {giocatore.soldiNascosti > 0 && (
        <Riquadro label="Nascosti" value={`${giocatore.soldiNascosti} €`} soloDesktop />
      )}
    </div>
  )
}

/** Il debito di sonno in ore: a zero si dice «a posto», non «0 h». */
function debitoLeggibile(debito: number): string {
  return debito <= 0 ? 'a posto' : `-${Math.round(debito)} h`
}

function nomeLuogo(id: string): string {
  try {
    return luogoPerId(id).nome
  } catch {
    return id
  }
}
