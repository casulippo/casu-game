import { useEffect } from 'react'
import { useGame } from '../store'

/**
 * Le due righe che servono per cominciare.
 *
 * Un gioco che non spiega i suoi comandi si gioca a tentoni per cinque minuti,
 * e cinque minuti sono più di quanto duri la pazienza di chi prova. Ma chi sa
 * già come si fa deve poterla togliere di mezzo subito: si salta col primo
 * tasto o col pulsante, e non torna più — a meno di richiamarla dalla HUD.
 */
export function Intro() {
  const aperta = useGame((s) => s.introAperta)
  const chiudi = useGame((s) => s.chiudiIntro)

  useEffect(() => {
    if (!aperta) return

    const salta = () => chiudi()
    window.addEventListener('keydown', salta)
    return () => window.removeEventListener('keydown', salta)
  }, [aperta, chiudi])

  if (!aperta) return null

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-md flex-col rounded-xl bg-slate-900/80 ring-1 ring-slate-700 sm:max-w-lg">
        {/* Il pulsante resta fuori dalla parte che scorre: su uno schermo basso
            finiva sotto il bordo, e sembrava che non ci fosse. */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-amber-400 sm:text-3xl">
            SPACCIO CITY
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Vivi solo, non hai una lira. Fai più soldi che puoi.
          </p>
        </div>

        <ol className="flex flex-col gap-2 text-sm text-slate-300">
          <Passo numero="1">
            Compra al <strong className="text-slate-100">bazar</strong>, dietro i palazzoni.
            Te ne vendono un tanto al giorno, e il credito riapre solo quando torni a
            dormire.
          </Passo>
          <Passo numero="2">
            Vendi per strada col pulsante in basso a sinistra. Più il quartiere è ricco,
            più paga — e più ti guarda la polizia.
          </Passo>
          <Passo numero="3">
            Quello che hai addosso lo perdi se ti prendono. Mettilo nei{' '}
            <strong className="text-slate-100">nascondigli</strong>: sono i cerchietti per
            terra, e quello che ci lasci non te lo tocca nessuno.
          </Passo>
          <Passo numero="4">
            Torna a casa a mangiare e dormire: chiude la giornata e ti rimette in sesto.
          </Passo>
        </ol>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400">
          <Comando tasto="WASD / frecce">muoversi</Comando>
          <Comando tasto="joystick">su telefono, mezzo schermo a sinistra</Comando>
          <Comando tasto="E">parlare, entrare, usare</Comando>
          <Comando tasto="clic / spazio">sparare dove punti</Comando>
          <Comando tasto="M">la mappa della città</Comando>
          <Comando tasto="★ rosse">quanto ti cerca la polizia</Comando>
        </div>

        <p className="text-xs text-slate-500">
          Si comincia col coltello. La pistola te la regala il vecchietto dell'armeria, dopo
          che avrai ripulito il parchetto a nord-ovest.
        </p>

        </div>

        <div className="border-t border-slate-700/70 p-3">
          <button
            type="button"
            onClick={chiudi}
            className="mx-auto block touch-none rounded-full bg-amber-500 px-8 py-2.5 text-sm font-semibold text-slate-950 transition active:scale-95"
          >
            Comincia <span className="font-normal opacity-70">(o premi un tasto)</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Passo({ numero, children }: { numero: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-mono text-[11px] text-amber-400">
        {numero}
      </span>
      <span>{children}</span>
    </li>
  )
}

function Comando({ tasto, children }: { tasto: string; children: string }) {
  return (
    <>
      <span className="font-mono text-slate-200">{tasto}</span>
      <span>{children}</span>
    </>
  )
}
