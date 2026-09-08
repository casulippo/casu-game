import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { CityScene } from './scenes/CityScene'
import { InteriorScene } from './scenes/InteriorScene'

/**
 * Monta il gioco Phaser dentro React.
 *
 * Phaser vive fuori dal ciclo di render di React: il canvas viene creato una
 * volta sola e distrutto allo smontaggio. React non ridisegna mai il canvas,
 * si limita a ospitarlo.
 */
export function PhaserCanvas() {
  const contenitore = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contenitore.current) return

    const gioco = new Phaser.Game({
      type: Phaser.AUTO,
      parent: contenitore.current,
      pixelArt: true,
      // Arrotonda le posizioni di disegno all'intero: senza, la camera che
      // insegue il giocatore su coordinate frazionarie fa vibrare i bordi dei
      // tile di un pixel, e il terreno sembra ondeggiare.
      roundPixels: true,
      // Niente motore fisico: le collisioni sono su griglia, in engine/city.ts
      scale: {
        // RESIZE, non FIT: il canvas prende tutto lo spazio disponibile invece
        // di adattare un formato fisso. Su telefono significa niente bande nere,
        // in verticale come in orizzontale.
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
      },
      scene: [CityScene, InteriorScene],
    })

    return () => gioco.destroy(true)
  }, [])

  return <div ref={contenitore} className="absolute inset-0" />
}
