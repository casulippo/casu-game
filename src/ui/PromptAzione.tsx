import { useGame } from '../store'
import { luogoPerId } from '../engine/luoghi'

/**
 * Il pulsante di interazione.
 *
 * Su telefono non esiste il tasto E, quindi l'azione deve essere raggiungibile
 * col pollice. Sta in basso a destra, opposto al joystick.
 */
export function PromptAzione() {
  const ambiente = useGame((s) => s.ambiente)
  const luogoVicino = useGame((s) => s.luogoVicino)
  const entraIn = useGame((s) => s.entraIn)
  const esci = useGame((s) => s.esci)

  if (!luogoVicino) return null

  if (ambiente === 'interno') {
    return <Pulsante etichetta="Esci" azione={esci} />
  }

  const luogo = luogoPerId(luogoVicino)

  if (!luogo.accessibile) {
    return (
      <Avviso testo={`${luogo.nome} — ${luogo.motivoChiusura ?? 'chiuso'}`} />
    )
  }

  return (
    <Pulsante
      etichetta={`Entra in ${luogo.nome}`}
      azione={() => entraIn(luogo.id)}
    />
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
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
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
    </div>
  )
}

function Avviso({ testo }: { testo: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
      <p className="rounded-full bg-slate-900/85 px-5 py-2.5 text-sm text-slate-300 ring-1 ring-slate-700 backdrop-blur-sm">
        {testo}
      </p>
    </div>
  )
}
