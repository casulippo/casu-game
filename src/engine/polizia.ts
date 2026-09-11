import type { Griglia } from './iso'
import type { GameState } from './state'
import { avanza, iniziaScontro, type Comandi, type Evento, type EsitoScontro, type Scontro, type SpecNemico } from './combattimento'
import { hannoVisto } from './memoria'
import { colpisciPassante } from './spaccio'
import { perdiTutto } from './nascondigli'
import { statisticheEffettive } from './statistiche'
import { avanza as avanzaTempo } from './time'

/**
 * La polizia.
 *
 * Fuori dai raid della storia, la polizia non arriva per caso: arriva per
 * quello che il giocatore ha fatto. Vendere in un quartiere sorvegliato,
 * sparare in mezzo alla gente, stendere un agente — ogni cosa lascia calore, e
 * il calore chiama il raid.
 *
 * Il calore scende col tempo passato tranquillo, quindi starsene buoni è una
 * strategia vera e non solo un'attesa.
 */

export const CALORE_MASSIMO = 100

/** Le soglie di calore a cui scatta ogni stella. */
const SOGLIE_RICERCA = [10, 30, 50, 75]

/** Quanto calore lascia ogni cosa che si fa. */
export const CALORE = {
  venditaNotata: 6,
  passanteColpito: 8,
  poliziottoAbbattuto: 25,
  raidScampato: -30,
  raidVinto: 15,
}

/** Di quanto scende il calore per ogni ora di gioco passata tranquilla. */
const RAFFREDDAMENTO_ORARIO = 2

/** Il livello di ricerca che si vede a schermo, da 0 a 4. */
export function livelloRicerca(stato: GameState): 0 | 1 | 2 | 3 | 4 {
  const superate = SOGLIE_RICERCA.filter((s) => stato.polizia.calore >= s).length
  return superate as 0 | 1 | 2 | 3 | 4
}

export function conCalore(stato: GameState, delta: number): GameState {
  const calore = Math.min(CALORE_MASSIMO, Math.max(0, arrotonda(stato.polizia.calore + delta)))
  return { ...stato, polizia: { calore } }
}

/** Il tempo che passa tranquillo raffredda le acque. */
export function raffredda(stato: GameState, ore: number): GameState {
  return conCalore(stato, -Math.max(0, ore) * RAFFREDDAMENTO_ORARIO)
}

/**
 * Quanto è probabile che una vendita venga notata.
 *
 * Il rischio arriva da `spaccio.ts` e tiene già conto del quartiere e di che
 * roba si sta girando.
 */
export function probabilitaDiEssereNotato(rischio: number): number {
  return arrotonda(rischio * 0.05)
}

/**
 * Registrare una vendita.
 *
 * `tiro` è un numero fra 0 e 1: sotto la probabilità qualcuno ha visto, e il
 * calore sale.
 */
export function vistiVendere(stato: GameState, rischio: number, tiro: number): GameState {
  if (tiro >= probabilitaDiEssereNotato(rischio)) return stato
  return conCalore(stato, CALORE.venditaNotata)
}

/** Quanti agenti manda un raid a questo livello di ricerca. */
const AGENTI = [0, 2, 4, 6, 9]

export function agentiDelRaid(stato: GameState): number {
  return AGENTI[livelloRicerca(stato)]
}

/**
 * Quanto è probabile che parta un raid, per minuto di gioco.
 *
 * A ricerca zero non parte niente: senza aver fatto nulla non si viene
 * braccati.
 */
export function probabilitaDiRaid(stato: GameState): number {
  const livello = livelloRicerca(stato)
  return livello === 0 ? 0 : arrotonda(0.02 * livello)
}

/**
 * Far scattare un raid, se è il caso.
 *
 * Gli agenti nascono in cerchio attorno al giocatore, abbastanza lontano da
 * lasciargli la scelta fra scappare e sparare.
 */
export function forseUnRaid(
  stato: GameState,
  posizione: Griglia,
  tiro: number,
): GameState {
  // Un raid alla volta: la strada invece non è uno scontro, e non impedisce
  // niente.
  if (stato.scontro?.tipo === 'raid' || tiro >= probabilitaDiRaid(stato)) return stato
  return conRaid(stato, posizione, agentiDelRaid(stato))
}

/**
 * La città di tutti i giorni.
 *
 * Esiste sempre, appena si mette piede fuori: è il campo in cui camminano i
 * passanti e in cui vola quello che spari. Non ha nemici, non si vince e non
 * si perde — a meno di farsi ammazzare, il che può succedere anche qui.
 */
export function apriLaStrada(stato: GameState, posizione: Griglia): GameState {
  if (stato.scontro) return stato

  const statistiche = statisticheEffettive(stato)

  return {
    ...stato,
    scontro: iniziaScontro({
      tipo: 'strada',
      posGiocatore: posizione,
      arma: stato.giocatore.arma,
      vita: statistiche.vita,
      mira: statistiche.mira,
      nemici: [],
      seme: stato.tempo.giorno * 7_919 + stato.tempo.ora * 60 + stato.tempo.minuto,
    }),
  }
}

/** Il raid vero e proprio: quello della storia si dichiara non evitabile. */
export function conRaid(
  stato: GameState,
  posizione: Griglia,
  quanti: number,
  evitabile = true,
): GameState {
  const nemici: SpecNemico[] = []
  const raggio = 10

  for (let i = 0; i < quanti; i++) {
    const angolo = (Math.PI * 2 * i) / quanti
    nemici.push({
      tipo: 'poliziotto',
      pos: {
        x: posizione.x + Math.cos(angolo) * raggio,
        y: posizione.y + Math.sin(angolo) * raggio,
      },
    })
  }

  // Il giubbotto antiproiettile conta come vita vera, non come voce a parte.
  const statistiche = statisticheEffettive(stato)

  const appena = iniziaScontro({
    posGiocatore: posizione,
    arma: stato.giocatore.arma,
    vita: statistiche.vita,
    mira: statistiche.mira,
    nemici,
    evitabile,
    seme: stato.tempo.giorno * 1_000 + stato.tempo.ora * 60 + stato.tempo.minuto,
  })

  // Se si era per strada, la gente che c'era resta dov'era: un raid non
  // svuota il marciapiede, lo attraversa.
  const strada = stato.scontro?.tipo === 'strada' ? stato.scontro : null
  if (!strada) return { ...stato, scontro: appena }

  return {
    ...stato,
    scontro: {
      ...strada,
      tipo: 'raid',
      evitabile,
      esito: 'in-corso',
      tempo: 0,
      tempoNascosto: 0,
      giocatore: { ...strada.giocatore, arma: stato.giocatore.arma },
      nemici: [
        ...strada.nemici,
        ...appena.nemici.map((n, i) => ({ ...n, id: strada.prossimoId + i })),
      ],
      prossimoId: strada.prossimoId + appena.nemici.length,
    },
  }
}

/**
 * Un passo di scontro, applicato allo stato di gioco.
 *
 * Il combattimento non sa niente di soldi, clienti e polizia: qui si prendono i
 * suoi eventi e si paga il conto.
 */
export function combatti(stato: GameState, dt: number, comandi: Comandi): GameState {
  if (!stato.scontro) return stato

  // L'arma è quella che si ha in mano adesso: la strada dura ore, e cambiarla
  // all'armeria deve valere subito, non al prossimo scontro.
  const scontro =
    stato.scontro.giocatore.arma === stato.giocatore.arma
      ? stato.scontro
      : {
          ...stato.scontro,
          giocatore: { ...stato.scontro.giocatore, arma: stato.giocatore.arma },
        }

  const passo = avanza(scontro, dt, comandi)
  let dopo: GameState = { ...stato, scontro: passo.scontro }

  for (const evento of passo.eventi) dopo = applica(dopo, evento)

  return dopo
}

function applica(stato: GameState, evento: Evento): GameState {
  switch (evento.tipo) {
    case 'passante-colpito':
      return hannoVisto(
        conCalore(colpisciPassante(stato), CALORE.passanteColpito),
        'sparato',
      )

    case 'nemico-abbattuto':
      return evento.nemico === 'poliziotto'
        ? conCalore(stato, CALORE.poliziottoAbbattuto)
        : stato

    case 'esito':
      return chiudiScontro(stato, evento.esito)

    default:
      return stato
  }
}

/**
 * Come finisce un raid.
 *
 * Perderlo costa tutto quello che si ha addosso e in casa — restano solo i
 * nascondigli — e una notte in cella. Scamparlo raffredda le acque; vincerlo
 * lasciando agenti a terra le riscalda, che è il prezzo di aver sparato.
 */
export function chiudiScontro(stato: GameState, esito: EsitoScontro): GameState {
  if (esito === 'in-corso') return stato

  const senzaScontro: GameState = { ...stato, scontro: null }

  if (esito === 'perso') return arresto(senzaScontro)
  if (esito === 'scampato') return conCalore(senzaScontro, CALORE.raidScampato)
  return conCalore(senzaScontro, CALORE.raidVinto)
}

/**
 * Finire in cella.
 *
 * Si perde il contante addosso, la roba addosso e il gruzzolo di casa, e ci si
 * ritrova il mattino dopo. Il livello resta: è una soglia raggiunta.
 */
export function arresto(stato: GameState): GameState {
  const svuotato = perdiTutto({ ...stato, scontro: null })

  return {
    ...svuotato,
    polizia: { calore: 0 },
    tempo: avanzaTempo(svuotato.tempo, oreFinoAlMattino(svuotato.tempo.ora)),
    sonno: { debito: svuotato.sonno.debito + 3 },
  }
}

/** In cella ci si sta fino alle otto del mattino. */
function oreFinoAlMattino(ora: number): number {
  return (8 - ora + 24) % 24 || 24
}

/** Lo scontro è finito? Serve a chi guarda da fuori, senza toccare gli eventi. */
export function scontroInCorso(stato: GameState): Scontro | null {
  return stato.scontro && stato.scontro.esito === 'in-corso' ? stato.scontro : null
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100
}

/**
 * Rimettersi in sesto.
 *
 * Le ferite prese per strada restavano addosso per sempre: lo scontro di strada
 * non finisce mai, e con lui la barra della vita. Mangiare e dormire curano —
 * è l'unico modo che il protagonista ha di guarire.
 */
export function curati(stato: GameState): GameState {
  if (!stato.scontro || stato.scontro.tipo !== 'strada') return stato

  const pieno = statisticheEffettive(stato).vita
  if (stato.scontro.giocatore.vita >= pieno) return stato

  return {
    ...stato,
    scontro: {
      ...stato.scontro,
      giocatore: { ...stato.scontro.giocatore, vita: pieno, vitaMax: pieno },
    },
  }
}
