import { PhaserCanvas } from './game/PhaserCanvas'
import { HUD } from './ui/HUD'
import { Nokia } from './ui/Nokia'
import { PromptAzione } from './ui/PromptAzione'
import { Scontro } from './ui/Scontro'
import { Strada } from './ui/Strada'
import { TouchControls } from './ui/TouchControls'

/**
 * Il gioco occupa tutto lo schermo; HUD e comandi stanno sopra al canvas.
 *
 * `h-dvh` invece di `h-screen`: sui browser mobile la barra degli indirizzi
 * compare e scompare, e `100vh` non ne tiene conto — il fondo della pagina
 * finirebbe sotto la barra.
 */
export default function App() {
  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-slate-950 text-slate-200">
      <PhaserCanvas />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-2 sm:p-4">
        <HUD />
      </div>

      <Scontro />
      <Strada />
      <Nokia />
      <TouchControls />
      <PromptAzione />
    </main>
  )
}
