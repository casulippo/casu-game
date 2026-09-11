import { useEffect, useState } from 'react'
import { useGame } from '../store'
import { contanteAddosso, FABBISOGNO_SONNO } from '../engine/azioniCasa'
import { armaPerId } from '../engine/armi'
import {
  DROGHE,
  drogheAlBazar,
  grammiComprabili,
  grammiDi,
  grammiTotali,
} from '../engine/droga'
import type { Mobile } from '../engine/interni'
import { tettoBazar } from '../engine/livello'
import type { Luogo } from '../engine/luoghi'
import {
  armiInVendita,
  drogheDallaMafia,
  grammiDallaMafia,
  laMafiaTiConsidera,
  prezzoArmeria,
  strumentiInVendita,
} from '../engine/negozi'
import type { Npc } from '../engine/npc'
import {
  attivo,
  deposito,
  nascondigliUsati,
  puoUsare,
  type Nascondiglio,
} from '../engine/nascondigli'
import { haDaVersare, type Spaccino } from '../engine/spaccini'
import { OFFERTA_BAZAR } from '../engine/storia'

/**
 * Il pulsante di interazione.
 *
 * Su telefono non esiste il tasto E, quindi l'azione deve essere raggiungibile
 * col pollice. Sta in basso al centro, sopra al joystick.
 *
 * Il tipo di `interazione` è discriminato, quindi ogni caso porta con sé i
 * propri dati: non si può finire a cercare il nome di un luogo che non c'è.
 */
export function PromptAzione() {
  const interazione = useGame((s) => s.interazione)
  const entraIn = useGame((s) => s.entraIn)
  const esci = useGame((s) => s.esci)

  if (!interazione) return null

  switch (interazione.tipo) {
    case 'esci':
      return <Pulsante etichetta="Esci" azione={esci} />

    case 'entra':
      return (
        <Pulsante
          etichetta={`Entra in ${interazione.luogo.nome}`}
          azione={() => entraIn(interazione.luogo.id)}
        />
      )

    case 'bottega':
      return <Bottega luogo={interazione.luogo} />

    case 'parla':
      return <Parla npc={interazione.npc} />

    case 'spaccino':
      return <DalloSpaccino spaccino={interazione.spaccino} />

    case 'nascondiglio':
      return <AlNascondiglio nascondiglio={interazione.nascondiglio} />

    case 'bloccato':
      return (
        <Avviso
          testo={`${interazione.luogo.nome} — ${
            interazione.luogo.motivoChiusura ?? 'chiuso'
          }`}
        />
      )

    case 'mobile':
      return <AzioneMobile mobile={interazione.mobile} />
  }
}

/** Due parole con chi si incontra. Per ora è un saluto, e conta come primo passo. */
function Parla({ npc }: { npc: Npc }) {
  const parlaCon = useGame((s) => s.parlaCon)
  const gia = useGame((s) => s.primiPassi.parlatoCon.includes(npc.id))

  return (
    <Pulsante
      etichetta={`${gia ? 'Saluta' : 'Parla con'} ${npc.nome}`}
      azione={() => parlaCon(npc.id)}
    />
  )
}

/**
 * Il nascondiglio sotto i piedi.
 *
 * Quello che si lascia qui è l'unica cosa che un arresto non porta via. Il
 * limite del livello è sul numero di posti riforniti, quindi un posto già
 * usato si apre sempre, uno nuovo solo se ne restano.
 */
function AlNascondiglio({ nascondiglio }: { nascondiglio: Nascondiglio }) {
  const [aperto, setAperto] = useState(false)
  const stato = useGame()
  const depositaContante = useGame((s) => s.depositaContante)
  const ritiraContante = useGame((s) => s.ritiraContante)
  const depositaRoba = useGame((s) => s.depositaRoba)
  const ritiraRoba = useGame((s) => s.ritiraRoba)

  const dentro = deposito(stato, nascondiglio.id)
  const pieno = attivo(dentro)

  if (!aperto) {
    return (
      <Pulsante
        etichetta={pieno ? `${nascondiglio.nome} — c'è roba tua` : nascondiglio.nome}
        azione={() => setAperto(true)}
      />
    )
  }

  const chiudi = () => setAperto(false)

  if (!puoUsare(stato, nascondiglio.id)) {
    return (
      <Pannello
        titolo={`Ne tieni già ${nascondigliUsati(stato)}: più di così non riesci a ricordarli`}
        chiudi={chiudi}
      >
        {[]}
      </Pannello>
    )
  }

  const contante = Math.floor(stato.giocatore.contante)
  const addosso = DROGHE.filter((d) => grammiDi(stato.giocatore.roba, d.id) > 0)
  const messa = DROGHE.filter((d) => grammiDi(dentro.roba, d.id) > 0)

  return (
    <Pannello
      titolo={
        pieno
          ? `Qui dentro: ${dentro.soldi} € e ${grammiTotali(dentro.roba)} g`
          : 'Vuoto. Ci sta quello che non vuoi perdere'
      }
      chiudi={chiudi}
    >
      {contante > 0 && (
        <Scelta
          etichetta={`Metti via ${contante} €`}
          azione={() => depositaContante(nascondiglio.id, contante)}
        />
      )}

      {addosso.map((droga) => (
        <Scelta
          key={`giu-${droga.id}`}
          etichetta={`Nascondi ${grammiDi(stato.giocatore.roba, droga.id)} g di ${droga.nome}`}
          azione={() =>
            depositaRoba(nascondiglio.id, droga.id, grammiDi(stato.giocatore.roba, droga.id))
          }
        />
      ))}

      {dentro.soldi > 0 && (
        <Scelta
          etichetta={`Riprendi ${dentro.soldi} €`}
          azione={() => ritiraContante(nascondiglio.id, dentro.soldi)}
        />
      )}

      {messa.map((droga) => (
        <Scelta
          key={`su-${droga.id}`}
          etichetta={`Riprendi ${grammiDi(dentro.roba, droga.id)} g di ${droga.nome}`}
          azione={() => ritiraRoba(nascondiglio.id, droga.id, grammiDi(dentro.roba, droga.id))}
        />
      ))}
    </Pannello>
  )
}

/**
 * Passare dal proprio spaccino.
 *
 * Se ha soldi da dare li dà subito — passarci sopra è il gesto — altrimenti si
 * apre il pannello per lasciargli altra roba.
 */
function DalloSpaccino({ spaccino }: { spaccino: Spaccino }) {
  const [aperto, setAperto] = useState(false)
  const ritiraDa = useGame((s) => s.ritiraDa)
  const affidaMeta = useGame((s) => s.affidaMeta)
  const roba = useGame((s) => s.giocatore.roba)

  if (haDaVersare(spaccino)) {
    return (
      <Pulsante
        etichetta={`Ritira ${Math.round(spaccino.cassa)} € da ${spaccino.nome}`}
        azione={() => ritiraDa(spaccino.id)}
      />
    )
  }

  if (!aperto) {
    return (
      <Pulsante
        etichetta={`${spaccino.nome} — ${grammiTotali(spaccino.roba)} g`}
        azione={() => setAperto(true)}
      />
    )
  }

  const inTasca = DROGHE.filter((d) => grammiDi(roba, d.id) >= 2)

  return (
    <Pannello
      titolo={
        inTasca.length > 0 ? 'Quanto gliene lasci? Metà' : 'Non hai roba da lasciargli'
      }
      chiudi={() => setAperto(false)}
    >
      {inTasca.map((droga) => (
        <Scelta
          key={droga.id}
          etichetta={`${droga.nome} — ${Math.floor(grammiDi(roba, droga.id) / 2)} g`}
          azione={() => {
            affidaMeta(spaccino.id, droga.id)
            setAperto(false)
          }}
        />
      ))}
    </Pannello>
  )
}

/**
 * I banconi.
 *
 * Non si entra: si apre un pannello sulla soglia e si compra. Ogni bottega
 * vende la sua roba e nient'altro.
 */
function Bottega({ luogo }: { luogo: Luogo }) {
  const [aperto, setAperto] = useState(false)

  if (!aperto) {
    return <Pulsante etichetta={luogo.nome} azione={() => setAperto(true)} />
  }

  const chiudi = () => setAperto(false)

  if (luogo.tipo === 'bazar') return <BanconeDelBazar chiudi={chiudi} />
  if (luogo.tipo === 'armeria') return <BanconeDellArmeria chiudi={chiudi} />
  return <BanconeDelMercatoNero chiudi={chiudi} />
}

/** Il bazar del Tridente: la roba, col tetto della giornata. */
function BanconeDelBazar({ chiudi }: { chiudi: () => void }) {
  const stato = useGame()
  const compraRoba = useGame((s) => s.compraRoba)
  const compraLOfferta = useGame((s) => s.compraLOfferta)

  const listino = drogheAlBazar(stato.giocatore.incassoTotale)
  const residuo = Math.max(0, tettoBazar(stato.giocatore.livello) - stato.mercato.grammiPresiOggi)
  const offerta = stato.storia.passo === 'rifornimento'
  const contante = Math.round(stato.giocatore.contante)

  return (
    <Pannello
      titolo={
        offerta
          ? `Prezzi speciali — hai ${contante} €`
          : residuo === 0
            ? 'Per oggi non ti vendono più niente'
            : `Ancora ${residuo} g, e hai ${contante} €`
      }
      chiudi={chiudi}
    >
      {offerta && (
        <Scelta
          etichetta={`${OFFERTA_BAZAR.grammi} g a 100 €`}
          azione={() => {
            compraLOfferta()
            chiudi()
          }}
        />
      )}

      {listino.map((droga) =>
        // I tagli proposti sono solo quelli pagabili davvero: un prezzo scritto
        // che poi non si può onorare è peggio di un taglio in meno.
        tagli(grammiComprabili(stato, droga.id)).map((grammi) => (
          <Scelta
            key={`${droga.id}-${grammi}`}
            etichetta={`${droga.nome} ${grammi} g — ${grammi * droga.prezzoAcquisto} €`}
            azione={() => compraRoba(droga.id, grammi)}
          />
        )),
      )}
    </Pannello>
  )
}

/** I tagli da mostrare quando si può arrivare fino a `massimo` grammi. */
function tagli(massimo: number): number[] {
  const proposti = [10, 40].filter((g) => g < massimo)
  return massimo > 0 ? [...proposti, massimo] : []
}

/** L'armeria del vecchietto: prezzi scontati a chi gli tiene tranquilla la zona. */
function BanconeDellArmeria({ chiudi }: { chiudi: () => void }) {
  const stato = useGame()
  const compra = useGame((s) => s.compraArma)
  const impugna = useGame((s) => s.impugna)
  const visitaArmeria = useGame((s) => s.visitaArmeria)

  useEffect(() => visitaArmeria(), [visitaArmeria])

  const inVendita = armiInVendita(stato)

  return (
    <Pannello titolo={`Hai ${Math.round(stato.giocatore.contante)} €`} chiudi={chiudi}>
      {inVendita.map((arma) => (
        <Scelta
          key={arma.id}
          etichetta={`${arma.nome} — ${prezzoArmeria(stato, arma.id)} €`}
          azione={() => compra(arma.id)}
        />
      ))}

      {stato.giocatore.armi
        .filter((id) => id !== stato.giocatore.arma)
        .map((id) => (
          <Scelta
            key={id}
            etichetta={`Impugna ${armaPerId(id).nome}`}
            azione={() => impugna(id)}
          />
        ))}
    </Pannello>
  )
}

/**
 * Il mercato nero della mafia: strumenti, e la roba pesante per chi conta.
 *
 * Le droghe le tirano fuori solo dopo che l'uomo in grigio ti ha parlato: qui
 * si vede il listino, ma il permesso si prende in strada.
 */
function BanconeDelMercatoNero({ chiudi }: { chiudi: () => void }) {
  const stato = useGame()
  const compra = useGame((s) => s.compraStrumento)
  const compraDallaMafia = useGame((s) => s.compraDallaMafia)

  const pesanti = drogheDallaMafia(stato)
  const contante = Math.round(stato.giocatore.contante)

  return (
    <Pannello
      titolo={
        pesanti.length > 0 || !laMafiaTiConsidera(stato)
          ? `Hai ${contante} €`
          : 'Attrezzatura. Per il resto parla con l uomo in grigio'
      }
      chiudi={chiudi}
    >
      {pesanti.map((droga) =>
        tagli(Math.min(grammiDallaMafia(stato, droga.id), 50)).map((grammi) => (
          <Scelta
            key={`${droga.id}-${grammi}`}
            etichetta={`${droga.nome} ${grammi} g — ${grammi * droga.prezzoAcquisto} €`}
            azione={() => compraDallaMafia(droga.id, grammi)}
          />
        )),
      )}

      {strumentiInVendita(stato).map((strumento) => (
        <Scelta
          key={strumento.id}
          etichetta={`${strumento.nome} — ${strumento.prezzo} €`}
          azione={() => compra(strumento.id)}
        />
      ))}
    </Pannello>
  )
}

/**
 * Le azioni dei mobili.
 *
 * Dormire e nascondere hanno bisogno di una quantità — quante ore, quanti
 * soldi — quindi aprono un pannello invece di risolversi al primo tocco.
 * Mangiare no: un pasto è un pasto.
 */
function AzioneMobile({ mobile }: { mobile: Mobile }) {
  const [aperto, setAperto] = useState(false)

  const mangia = useGame((s) => s.mangia)

  if (mobile.tipo.azione === 'mangia') {
    return <Pulsante etichetta={`Mangia — ${mobile.tipo.nome}`} azione={mangia} />
  }

  if (!aperto) {
    return (
      <Pulsante
        etichetta={`${etichettaAzione(mobile)} — ${mobile.tipo.nome}`}
        azione={() => setAperto(true)}
      />
    )
  }

  return mobile.tipo.azione === 'dormi' ? (
    <PannelloSonno chiudi={() => setAperto(false)} />
  ) : (
    <PannelloNascondiglio chiudi={() => setAperto(false)} />
  )
}

function etichettaAzione(mobile: Mobile): string {
  switch (mobile.tipo.azione) {
    case 'dormi':
      return 'Dormi'
    case 'nascondi':
      return 'Apri'
    default:
      return 'Usa'
  }
}

/** Quante ore dormire: il giocatore sceglie, il sonno non è automatico. */
function PannelloSonno({ chiudi }: { chiudi: () => void }) {
  const dormi = useGame((s) => s.dormi)
  const debito = useGame((s) => s.sonno.debito)

  return (
    <Pannello
      titolo={debito > 0 ? `Sei indietro di ${Math.round(debito)} ore` : 'Quanto dormi?'}
      chiudi={chiudi}
    >
      {[2, FABBISOGNO_SONNO, 9].map((ore) => (
        <Scelta
          key={ore}
          etichetta={ore <= 2 ? `Pisolino (${ore}h)` : `${ore} ore`}
          azione={() => {
            dormi(ore)
            chiudi()
          }}
        />
      ))}
    </Pannello>
  )
}

/** Il nascondiglio: quanto contante mettere via, e quanto riprendere. */
function PannelloNascondiglio({ chiudi }: { chiudi: () => void }) {
  const nascondi = useGame((s) => s.nascondi)
  const riprendi = useGame((s) => s.riprendi)
  const nascosti = useGame((s) => s.giocatore.soldiNascosti)
  const addosso = useGame(contanteAddosso)

  return (
    <Pannello titolo={`Nascosti: ${nascosti} € — addosso: ${addosso} €`} chiudi={chiudi}>
      {addosso > 0 && (
        <Scelta
          etichetta={`Nascondi ${addosso} €`}
          azione={() => {
            nascondi(addosso)
            chiudi()
          }}
        />
      )}
      {nascosti > 0 && (
        <Scelta
          etichetta={`Riprendi ${nascosti} €`}
          azione={() => {
            riprendi(nascosti)
            chiudi()
          }}
        />
      )}
    </Pannello>
  )
}

function Pannello({
  titolo,
  chiudi,
  children,
}: {
  titolo: string
  chiudi: () => void
  children: React.ReactNode
}) {
  return (
    <Barra>
      <div className="pointer-events-auto flex flex-col items-stretch gap-2 rounded-2xl bg-slate-900/90 p-3 ring-1 ring-slate-700 backdrop-blur-sm">
        <p className="px-1 text-center text-xs text-slate-300">{titolo}</p>
        <div className="flex flex-wrap justify-center gap-2">{children}</div>
        <button
          type="button"
          onClick={chiudi}
          className="text-xs text-slate-400 underline-offset-2 hover:underline"
        >
          Lascia stare
        </button>
      </div>
    </Barra>
  )
}

function Scelta({ etichetta, azione }: { etichetta: string; azione: () => void }) {
  return (
    <button
      type="button"
      onClick={azione}
      className="touch-none rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition active:scale-95 active:bg-amber-400"
    >
      {etichetta}
    </button>
  )
}

function Pulsante({
  etichetta,
  azione,
}: {
  etichetta: string
  azione: () => void
}) {
  return (
    <Barra>
      <button
        type="button"
        onClick={azione}
        className="pointer-events-auto touch-none rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl ring-2 ring-amber-300/60 transition active:scale-95 active:bg-amber-400 sm:text-base"
      >
        {etichetta}
        <span className="ml-2 hidden text-xs font-normal opacity-70 sm:inline">
          (E)
        </span>
      </button>
    </Barra>
  )
}

function Avviso({ testo }: { testo: string }) {
  return (
    <Barra>
      <p className="rounded-full bg-slate-900/85 px-5 py-2.5 text-sm text-slate-300 ring-1 ring-slate-700 backdrop-blur-sm">
        {testo}
      </p>
    </Barra>
  )
}

function Barra({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 sm:bottom-10">
      {children}
    </div>
  )
}
