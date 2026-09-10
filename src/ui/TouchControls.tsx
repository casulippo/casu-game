import { useRef, useState } from 'react'
import { FERMO, RAGGIO_LEVETTA, spinta } from '../engine/joystick'
import { impostaSpinta } from '../game/input'

const DIAMETRO_BASE = RAGGIO_LEVETTA * 2
const DIAMETRO_LEVETTA = 56

/**
 * Joystick virtuale per il touch.
 *
 * Il centro non è fisso: si posiziona dove appoggi il dito dentro l'area attiva.
 * È il comportamento che si aspetta chi gioca sul telefono — non devi cercare
 * un cerchietto disegnato, comandi da dove ti è comodo tenere il pollice.
 */
export function TouchControls() {
  const area = useRef<HTMLDivElement>(null)
  const [centro, setCentro] = useState<{ x: number; y: number } | null>(null)
  const [levetta, setLevetta] = useState({ x: 0, y: 0 })

  function inizio(e: React.PointerEvent<HTMLDivElement>) {
    const rect = area.current!.getBoundingClientRect()
    const punto = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    area.current!.setPointerCapture(e.pointerId)
    setCentro(punto)
    setLevetta({ x: 0, y: 0 })
  }

  function movimento(e: React.PointerEvent<HTMLDivElement>) {
    if (!centro) return

    const rect = area.current!.getBoundingClientRect()
    const dito = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    // La levetta disegnata segue lo stesso asse della spinta: mostrarla libera
    // sulla diagonale mentre il personaggio si muove dritto sembrerebbe rotto.
    const s = spinta(centro, dito)
    setLevetta({ x: s.x * s.intensita * RAGGIO_LEVETTA, y: s.y * s.intensita * RAGGIO_LEVETTA })
    impostaSpinta(s)
  }

  function fine(e: React.PointerEvent<HTMLDivElement>) {
    area.current!.releasePointerCapture(e.pointerId)
    setCentro(null)
    setLevetta({ x: 0, y: 0 })
    impostaSpinta(FERMO)
  }

  return (
    <div
      ref={area}
      onPointerDown={inizio}
      onPointerMove={movimento}
      onPointerUp={fine}
      onPointerCancel={fine}
      className="absolute bottom-0 left-0 h-2/3 w-1/2 touch-none select-none"
      aria-label="Comando di movimento"
    >
      {centro && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border-2 border-slate-300/25 bg-slate-900/25"
            style={{
              width: DIAMETRO_BASE,
              height: DIAMETRO_BASE,
              left: centro.x - RAGGIO_LEVETTA,
              top: centro.y - RAGGIO_LEVETTA,
            }}
          />
          <div
            className="pointer-events-none absolute rounded-full border border-slate-200/50 bg-slate-200/40 shadow-lg"
            style={{
              width: DIAMETRO_LEVETTA,
              height: DIAMETRO_LEVETTA,
              left: centro.x + levetta.x - DIAMETRO_LEVETTA / 2,
              top: centro.y + levetta.y - DIAMETRO_LEVETTA / 2,
            }}
          />
        </>
      )}
    </div>
  )
}
