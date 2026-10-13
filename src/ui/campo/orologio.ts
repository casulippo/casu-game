import { useCallback, useEffect, useRef, useState } from 'react'

// Tempo di gioco continuo (minuti con decimali) che avanza in tempo reale fino a `limite`.
// `secondiPerMinuto(t)` decide il ritmo voluto; quello effettivo lo raggiunge gradualmente,
// così entrare o uscire da un'azione rallentata non dà strappi.
export function useOrologio(limite: number, fermo: boolean, secondiPerMinuto: (t: number) => number) {
  const tempo = useRef(0)
  const [t, setT] = useState(0)
  const ritmo = useRef(secondiPerMinuto)
  const ritmoAttuale = useRef<number | null>(null)

  useEffect(() => {
    ritmo.current = secondiPerMinuto
  })

  useEffect(() => {
    if (fermo || tempo.current >= limite) return
    let ultimo = performance.now()
    let ultimoAggiornamento = 0
    let frame = requestAnimationFrame(function passo(ora) {
      const dt = Math.max(0, Math.min(0.1, (ora - ultimo) / 1000))
      ultimo = ora
      const voluto = ritmo.current(tempo.current)
      const attuale = ritmoAttuale.current ?? voluto
      // Avvicinamento in scala logaritmica: circa 0,4 secondi reali per cambiare ritmo.
      const nuovo = Math.exp(Math.log(attuale) + (Math.log(voluto) - Math.log(attuale)) * (1 - Math.exp(-dt / 0.4)))
      ritmoAttuale.current = nuovo
      tempo.current = Math.min(limite, tempo.current + dt / nuovo)
      // Lo stato React si aggiorna 10 volte al secondo: basta per cronaca e tabellone.
      if (ora - ultimoAggiornamento > 100 || tempo.current >= limite) {
        ultimoAggiornamento = ora
        setT(tempo.current)
      }
      if (tempo.current < limite) frame = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(frame)
  }, [limite, fermo])

  const salta = useCallback(
    (a: number) => {
      tempo.current = Math.min(limite, a)
      setT(tempo.current)
    },
    [limite],
  )

  const leggi = useCallback(() => tempo.current, [])

  return { tempo, t, salta, leggi, ritmo: ritmoAttuale }
}
