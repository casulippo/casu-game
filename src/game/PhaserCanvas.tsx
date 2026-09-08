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
      // roundPixels resta disattivo di proposito: arrotondare all'intero rende
      // il movimento a scatti, perché a poche unità di spostamento per frame
      // l'arrotondamento alterna valori diversi. Serviva quando il suolo era
      // fatto di migliaia di tile separati, le cui giunzioni vibravano; ora è
      // un'immagine sola e il problema non si pone.
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
