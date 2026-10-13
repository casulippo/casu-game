import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Divisa } from './colori'
import { PORTIERE_CASA, PORTIERE_OSPITE } from './colori'
import { creaAnimatore } from './animazione'
import { LARGHEZZA, LUNGHEZZA, statoScena, type Scena, type Stato } from './scena'

// Le pedine inseguono la posizione calcolata con un ritardo morbido, come giocatori che corrono.
function useStatoAnimato(scena: Scena, tempo: RefObject<number>, ritmo: RefObject<number | null>) {
  const [stato, setStato] = useState<Stato>(() => statoScena(scena, tempo.current))
  const scenaRef = useRef(scena)

  useEffect(() => {
    scenaRef.current = scena
  }, [scena])

  useEffect(() => {
    const anima = creaAnimatore()
    let ultimo = performance.now()
    let frame = requestAnimationFrame(function passo(ora) {
      const dt = Math.max(0, Math.min(0.1, (ora - ultimo) / 1000))
      ultimo = ora
      setStato(anima(scenaRef.current, tempo.current, dt, ora / 1000, ritmo.current ?? 1).stato)
      frame = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(frame)
  }, [tempo, ritmo])

  return stato
}

export function Campo2D({
  scena,
  tempo,
  ritmo,
  divise,
  nomi,
}: {
  scena: Scena
  tempo: RefObject<number>
  ritmo: RefObject<number | null>
  divise: { casa: Divisa; ospite: Divisa }
  nomi: Record<string, string>
}) {
  const stato = useStatoAnimato(scena, tempo, ritmo)
  const portatore = stato.giocatori.find((g) => g.conPalla)

  return (
    <div className="relative">
      <svg viewBox="-4 -3 113 74" className="block w-full rounded-xl bg-emerald-900" role="img" aria-label="Campo di gioco">
        <Prato />
        {stato.giocatori.map((g) => {
          const divisa = g.ruolo === 'Goalkeeper' ? (g.casa ? PORTIERE_CASA : PORTIERE_OSPITE) : g.casa ? divise.casa : divise.ospite
          return (
            <g key={g.id} transform={`translate(${g.x} ${g.y})`}>
              {g.conPalla && <circle r={2.4} fill="none" stroke="white" strokeWidth={0.25} opacity={0.8} />}
              <circle r={1.5} fill={divisa.maglia} stroke={divisa.dettaglio} strokeWidth={0.4} />
              <text y={0.5} textAnchor="middle" fontSize={1.4} fontWeight={700} fill={divisa.dettaglio}>
                {g.numero}
              </text>
              {g.giallo && <rect x={0.9} y={-3.4} width={1.1} height={1.5} rx={0.15} fill="#facc15" />}
            </g>
          )
        })}
        <ellipse cx={stato.palla.x} cy={stato.palla.y} rx={0.55} ry={0.4} fill="black" opacity={0.35} />
        <circle
          cx={stato.palla.x + stato.palla.h * 0.15}
          cy={stato.palla.y - stato.palla.h * 0.45}
          r={0.55 + stato.palla.h * 0.06}
          fill="white"
          stroke="#111"
          strokeWidth={0.12}
        />
      </svg>
      <Sovraimpressione stato={stato} nomi={nomi} portatore={portatore?.nome} />
    </div>
  )
}

export function Sovraimpressione({ stato, nomi, portatore }: { stato: Stato; nomi: Record<string, string>; portatore?: string }) {
  const ev = stato.evidenza
  const testo = ev
    ? {
        gol: `GOL! ${nomi[ev.protagonista] ?? ''}`,
        parata: 'Parata!',
        palo: `Palo di ${nomi[ev.protagonista] ?? ''}!`,
        fuori: 'Fuori di poco',
        giallo: '',
      }[ev.tipo]
    : ''
  return (
    <>
      {testo && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
          <span
            className={`rounded-xl px-5 py-2 text-xl font-black shadow-2xl sm:text-3xl ${
              ev?.tipo === 'gol' ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-950/80 text-white'
            }`}
          >
            {testo}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 flex gap-2 text-xs">
        {portatore && <span className="rounded bg-slate-950/70 px-2 py-0.5 text-white">{portatore}</span>}
        {!stato.saliente && <span className="rounded bg-slate-950/70 px-2 py-0.5 text-slate-300">Avanti veloce ››</span>}
      </div>
    </>
  )
}

function Prato() {
  const strisce = 12
  const linea = { fill: 'none', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 0.25 }
  const area = (lato: 0 | 1, profondita: number, larghezza: number) => {
    const y = (LARGHEZZA - larghezza) / 2
    const x = lato === 0 ? 0 : LUNGHEZZA - profondita
    return <rect x={x} y={y} width={profondita} height={larghezza} {...linea} />
  }
  return (
    <g>
      {Array.from({ length: strisce }, (_, i) => (
        <rect
          key={i}
          x={(LUNGHEZZA / strisce) * i}
          y={0}
          width={LUNGHEZZA / strisce}
          height={LARGHEZZA}
          fill={i % 2 ? '#2f7d3a' : '#348a40'}
        />
      ))}
      <rect x={0} y={0} width={LUNGHEZZA} height={LARGHEZZA} {...linea} />
      <line x1={LUNGHEZZA / 2} y1={0} x2={LUNGHEZZA / 2} y2={LARGHEZZA} {...linea} />
      <circle cx={LUNGHEZZA / 2} cy={LARGHEZZA / 2} r={9.15} {...linea} />
      <circle cx={LUNGHEZZA / 2} cy={LARGHEZZA / 2} r={0.4} fill="white" />
      {area(0, 16.5, 40.32)}
      {area(1, 16.5, 40.32)}
      {area(0, 5.5, 18.32)}
      {area(1, 5.5, 18.32)}
      <circle cx={11} cy={LARGHEZZA / 2} r={0.3} fill="white" />
      <circle cx={LUNGHEZZA - 11} cy={LARGHEZZA / 2} r={0.3} fill="white" />
      <path d={`M 16.5 ${LARGHEZZA / 2 - 7.3} A 9.15 9.15 0 0 1 16.5 ${LARGHEZZA / 2 + 7.3}`} {...linea} />
      <path d={`M ${LUNGHEZZA - 16.5} ${LARGHEZZA / 2 - 7.3} A 9.15 9.15 0 0 0 ${LUNGHEZZA - 16.5} ${LARGHEZZA / 2 + 7.3}`} {...linea} />
      <rect x={-2} y={30.34} width={2} height={7.32} fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth={0.25} />
      <rect x={LUNGHEZZA} y={30.34} width={2} height={7.32} fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth={0.25} />
    </g>
  )
}
