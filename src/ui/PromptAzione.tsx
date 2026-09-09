import { useState } from 'react'
import { useGame } from '../store'
import { contanteAddosso, FABBISOGNO_SONNO } from '../engine/azioniCasa'
import type { Mobile } from '../engine/interni'

/**
 * Il pulsante di interazione.
 *
 * Su telefono non esiste il tasto E, quindi l'azione deve essere raggiungibile
 * col pollice. Sta in basso al centro, sopra al joystick.
 *
 * Il tipo di `interazione` è discriminato, quindi ogni caso porta con sé i
 * propri dati: non si può finire a cercare il nome di un luogo che non c'è.
 */
export function PromptAzione() {
  const interazione = useGame((s) => s.interazione)
  const entraIn = useGame((s) => s.entraIn)
  const esci = useGame((s) => s.esci)

  if (!interazione) return null

  switch (interazione.tipo) {
    case 'esci':
      return <Pulsante etichetta="Esci" azione={esci} />

    case 'entra':
      return (
        <Pulsante
          etichetta={`Entra in ${interazione.luogo.nome}`}
          azione={() => entraIn(interazione.luogo.id)}
        />
      )

    case 'bloccato':
      return (
        <Avviso
          testo={`${interazione.luogo.nome} — ${
            interazione.luogo.motivoChiusura ?? 'chiuso'
          }`}
        />
      )

    case 'mobile':
      return <AzioneMobile mobile={interazione.mobile} />
  }
}

/**
 * Le azioni dei mobili.
 *
 * Dormire e nascondere hanno bisogno di una quantità — quante ore, quanti
 * soldi — quindi aprono un pannello invece di risolversi al primo tocco.
 * Mangiare no: un pasto è un pasto.
 */
function AzioneMobile({ mobile }: { mobile: Mobile }) {
  const [aperto, setAperto] = useState(false)

  const mangia = useGame((s) => s.mangia)

  if (mobile.tipo.azione === 'mangia') {
    return <Pulsante etichetta={`Mangia — ${mobile.tipo.nome}`} azione={mangia} />
  }

  if (!aperto) {
    return (
      <Pulsante
        etichetta={`${etichettaAzione(mobile)} — ${mobile.tipo.nome}`}
        azione={() => setAperto(true)}
      />
    )
  }

  return mobile.tipo.azione === 'dormi' ? (
    <PannelloSonno chiudi={() => setAperto(false)} />
  ) : (
    <PannelloNascondiglio chiudi={() => setAperto(false)} />
  )
}

function etichettaAzione(mobile: Mobile): string {
  switch (mobile.tipo.azione) {
    case 'dormi':
      return 'Dormi'
    case 'nascondi':
      return 'Apri'
    default:
      return 'Usa'
  }
}

/** Quante ore dormire: il giocatore sceglie, il sonno non è automatico. */
function PannelloSonno({ chiudi }: { chiudi: () => void }) {
  const dormi = useGame((s) => s.dormi)
  const debito = useGame((s) => s.sonno.debito)

  return (
    <Pannello
      titolo={debito > 0 ? `Sei indietro di ${Math.round(debito)} ore` : 'Quanto dormi?'}
      chiudi={chiudi}
    >
      {[2, FABBISOGNO_SONNO, 9].map((ore) => (
        <Scelta
          key={ore}
          etichetta={ore <= 2 ? `Pisolino (${ore}h)` : `${ore} ore`}
          azione={() => {
            dormi(ore)
            chiudi()
          }}
        />
      ))}
    </Pannello>
  )
}

/** Il nascondiglio: quanto contante mettere via, e quanto riprendere. */
function PannelloNascondiglio({ chiudi }: { chiudi: () => void }) {
  const nascondi = useGame((s) => s.nascondi)
  const riprendi = useGame((s) => s.riprendi)
  const nascosti = useGame((s) => s.giocatore.soldiNascosti)
  const addosso = useGame(contanteAddosso)

  return (
    <Pannello titolo={`Nascosti: ${nascosti} € — addosso: ${addosso} €`} chiudi={chiudi}>
      {addosso > 0 && (
        <Scelta
          etichetta={`Nascondi ${addosso} €`}
          azione={() => {
            nascondi(addosso)
            chiudi()
          }}
        />
      )}
      {nascosti > 0 && (
        <Scelta
          etichetta={`Riprendi ${nascosti} €`}
          azione={() => {
            riprendi(nascosti)
            chiudi()
          }}
        />
      )}
    </Pannello>
  )
}

function Pannello({
  titolo,
  chiudi,
  children,
}: {
  titolo: string
  chiudi: () => void
  children: React.ReactNode
}) {
  return (
    <Barra>
      <div className="pointer-events-auto flex flex-col items-stretch gap-2 rounded-2xl bg-slate-900/90 p-3 ring-1 ring-slate-700 backdrop-blur-sm">
        <p className="px-1 text-center text-xs text-slate-300">{titolo}</p>
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
        <button
          type="button"
          onClick={chiudi}
          className="text-xs text-slate-400 underline-offset-2 hover:underline"
        >
          Lascia stare
        </button>
      </div>
    </Barra>
  )
}

function Scelta({ etichetta, azione }: { etichetta: string; azione: () => void }) {
  return (
    <button
      type="button"
      onClick={azione}
      className="touch-none rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition active:scale-95 active:bg-amber-400"
    >
      {etichetta}
    </button>
  )
}

function Pulsante({
  etichetta,
  azione,
}: {
  etichetta: string
  azione: () => void
}) {
  return (
    <Barra>
      <button
        type="button"
        onClick={azione}
        className="pointer-events-auto touch-none rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl ring-2 ring-amber-300/60 transition active:scale-95 active:bg-amber-400 sm:text-base"
      >
        {etichetta}
        <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">
          (E)
        </span>
      </button>
    </Barra>
  )
}

function Avviso({ testo }: { testo: string }) {
  return (
    <Barra>
      <p className="rounded-full bg-slate-900/85 px-5 py-2.5 text-sm text-slate-300 ring-1 ring-slate-700 backdrop-blur-sm">
        {testo}
      </p>
    </Barra>
  )
}

function Barra({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
      {children}
    </div>
  )
}
