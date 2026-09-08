import { useGame } from '../store'

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
  }
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
