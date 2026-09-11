import { useEffect, useMemo, useRef } from 'react'
import { useGame } from '../store'
import { LATO_CITTA, generaCitta, type Cella } from '../engine/city'
import { QUARTIERI, quartiereIn } from '../engine/quartieri'
import { LUOGHI } from '../engine/luoghi'
import { attivo, nascondigli } from '../engine/nascondigli'

/**
 * La mappa della città.
 *
 * Serve a una cosa sola: capire dove si è. La città è larga quasi cento celle
 * e l'inquadratura ne mostra una ventina, quindi senza una pianta ci si perde
 * fra due isolati uguali.
 *
 * Si disegna una volta su un canvas grande quanto la griglia — una cella, un
 * pixel — e poi si ingrandisce senza sfumare: è il modo più economico di
 * dipingere novemila celle, e il risultato somiglia alle mappe dei giochi da
 * cui questo viene.
 */

/** Il colore di ogni tipo di cella, dove non dipende dal quartiere. */
const COLORI: Partial<Record<Cella, string>> = {
  acqua: '#1e3f5c',
  albero: '#3f6b42',
  edificio: '#2a2a30',
  ostacolo: '#4a4a52',
}

function coloreDi(cella: Cella, x: number, y: number): string {
  const fisso = COLORI[cella]
  if (fisso) return fisso

  const zona = quartiereIn(x, y)
  const numero =
    cella === 'strada' ? zona.strada : cella === 'marciapiede' ? zona.marciapiede : zona.suolo

  return `#${numero.toString(16).padStart(6, '0')}`
}

export function Mappa() {
  const aperta = useGame((s) => s.mappaAperta)
  const alterna = useGame((s) => s.alternaMappa)

  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') alterna()
      if (e.key === 'Escape' && aperta) alterna()
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [alterna, aperta])

  if (!aperta) return null

  return <Pianta chiudi={alterna} />
}

function Pianta({ chiudi }: { chiudi: () => void }) {
  const cella = useGame((s) => s.cella)
  const depositi = useGame((s) => s.nascondigli)
  const spaccini = useGame((s) => s.spaccini)
  const tela = useRef<HTMLCanvasElement>(null)

  // La griglia non cambia mai: si dipinge una volta sola per tutta la partita.
  const citta = useMemo(() => generaCitta(), [])

  useEffect(() => {
    const ctx = tela.current?.getContext('2d')
    if (!ctx) return

    for (let y = 0; y < LATO_CITTA; y++) {
      for (let x = 0; x < LATO_CITTA; x++) {
        ctx.fillStyle = coloreDi(citta[y][x], x, y)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [citta])

  const inPercentuale = (v: number) => `${(v / LATO_CITTA) * 100}%`

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="relative aspect-square w-[min(80vw,70vh)] overflow-hidden rounded-lg ring-1 ring-slate-700">
        <canvas
          ref={tela}
          width={LATO_CITTA}
          height={LATO_CITTA}
          className="h-full w-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {QUARTIERI.map((zona) => (
          <span
            key={zona.id}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-slate-100/60 drop-shadow sm:text-[10px]"
            style={{
              left: inPercentuale(zona.origine.x + zona.larghezza / 2),
              top: inPercentuale(zona.origine.y + 4),
            }}
          >
            {zona.nome}
          </span>
        ))}

        {LUOGHI.map((luogo) => (
          <Segno
            key={luogo.id}
            x={luogo.porta.x}
            y={luogo.porta.y}
            colore="bg-amber-400"
            etichetta={luogo.nome}
          />
        ))}

        {nascondigli()
          .filter((posto) => attivo(depositi[posto.id] ?? { soldi: 0, roba: {} }))
          .map((posto) => (
            <Segno
              key={posto.id}
              x={posto.cella.x}
              y={posto.cella.y}
              colore="bg-emerald-400"
            />
          ))}

        {spaccini.map((s) => (
          <Segno key={s.id} x={s.cella.x} y={s.cella.y} colore="bg-sky-400" etichetta={s.nome} />
        ))}

        {/* Il puntino di chi guarda: più grande degli altri, e con l'alone. */}
        <span
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 ring-2 ring-red-200/70"
          style={{ left: inPercentuale(cella.x + 0.5), top: inPercentuale(cella.y + 0.5) }}
        />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-400">
        <Voce colore="bg-red-500">sei qui</Voce>
        <Voce colore="bg-amber-400">luoghi</Voce>
        <Voce colore="bg-emerald-400">nascondigli pieni</Voce>
        <Voce colore="bg-sky-400">spaccini</Voce>
      </div>

      <button
        type="button"
        onClick={chiudi}
        className="touch-none rounded-full bg-amber-500 px-6 py-2 text-sm font-semibold text-slate-950 transition active:scale-95"
      >
        Chiudi <span className="font-normal opacity-70">(M)</span>
      </button>
    </div>
  )
}

function Segno({
  x,
  y,
  colore,
  etichetta,
}: {
  x: number
  y: number
  colore: string
  etichetta?: string
}) {
  const inPercentuale = (v: number) => `${(v / LATO_CITTA) * 100}%`

  return (
    <span
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: inPercentuale(x + 0.5), top: inPercentuale(y + 0.5) }}
    >
      <span className={`block h-2 w-2 rounded-full ring-1 ring-slate-900/60 ${colore}`} />
      {/* L'etichetta va a fianco e non sotto: due luoghi vicini si
          scriverebbero addosso. */}
      {etichetta && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-slate-950/70 px-1 text-[8px] text-slate-100 sm:text-[10px]">
          {etichetta}
        </span>
      )}
    </span>
  )
}

function Voce({ colore, children }: { colore: string; children: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${colore}`} />
      {children}
    </span>
  )
}
