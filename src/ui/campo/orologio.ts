import { useEffect, useRef, useState } from 'react'

// Tempo di gioco continuo (minuti con decimali) che avanza in tempo reale.
// `secondiPerMinuto(t)` decide il ritmo: lento nelle azioni salienti, veloce nel resto.
export function useOrologio(limite: number, secondiPerMinuto: (t: number) => number) {
  const tempo = useRef(0)
  const [t, setT] = useState(0)
  const ritmo = useRef(secondiPerMinuto)

  useEffect(() => {
    ritmo.current = secondiPerMinuto
  })

  useEffect(() => {
    if (tempo.current >= limite) return
    let ultimo = performance.now()
    let ultimoAggiornamento = 0
    let frame = requestAnimationFrame(function passo(ora) {
      const dt = Math.min(0.1, (ora - ultimo) / 1000)
      ultimo = ora
      tempo.current = Math.min(limite, tempo.current + dt / ritmo.current(tempo.current))
      // Lo stato React si aggiorna 10 volte al secondo: basta per cronaca e tabellone.
      if (ora - ultimoAggiornamento > 100 || tempo.current >= limite) {
        ultimoAggiornamento = ora
        setT(tempo.current)
      }
      if (tempo.current < limite) frame = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(frame)
  }, [limite])

  const salta = (a: number) => {
    tempo.current = Math.min(limite, a)
    setT(tempo.current)
  }

  return { tempo, t, salta }
}
