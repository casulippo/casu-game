import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { CityScene } from './scenes/CityScene'

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
      width: 960,
      height: 640,
      pixelArt: true,
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [CityScene],
    })

    return () => gioco.destroy(true)
  }, [])

  return <div ref={contenitore} className="overflow-hidden rounded-lg shadow-2xl" />
}
