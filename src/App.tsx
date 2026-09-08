import { PhaserCanvas } from './game/PhaserCanvas'
import { HUD } from './ui/HUD'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Casu Game</h1>
          <p className="text-sm text-slate-400">
            Un giorno di vita dura 60 minuti reali.
          </p>
        </header>

        <HUD />

        <PhaserCanvas />

        <footer className="text-xs text-slate-500">
          Muoviti con le frecce o WASD.
        </footer>
      </div>
    </div>
  )
}
