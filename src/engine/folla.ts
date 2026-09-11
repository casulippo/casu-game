import type { Griglia } from './iso'
import type { Quartiere } from './state'
import type { Nemico, Scontro } from './combattimento'
import { quartierePerId } from './quartieri'

/**
 * La gente per strada.
 *
 * Non è scenografia: è la clientela, ed è anche il bersaglio che non andrebbe
 * mai colpito. Per questo i passanti vivono dentro lo scontro come tutti gli
 * altri corpi — un proiettile non ha modo di sapere che quello era uno che
 * passava di lì.
 *
 * Nascono fuori dallo schermo attorno al giocatore e spariscono quando si
 * allontanano troppo: la città sembra piena senza tenere in memoria migliaia di
 * persone che nessuno guarderà mai.
 */

/** Da quanto lontano nascono, in celle, quando la strada è già popolata. */
// Nove celle: appena oltre il bordo corto dell'inquadratura, che in verticale
// arriva a sei. Più lontano e la gente non farebbe in tempo ad arrivare.
const RAGGIO_NASCITA = 9

/**
 * Quanto vicino possono nascere quando la strada è ancora vuota.
 *
 * Arrivando in un quartiere nuovo, aspettare che la gente cammini fin dentro
 * l'inquadratura vorrebbe dire attraversare una città deserta: la prima
 * infornata compare anche a due passi, purché non in faccia.
 */
const RAGGIO_PRIMA_INFORNATA = 3

/** Oltre questa distanza vengono dimenticati. */
const RAGGIO_OBLIO = 15

/** Quante persone gira nel quartiere più vivo. */
const FOLLA_MASSIMA = 10

/** Quanti tentativi di far nascere qualcuno per secondo. */
const NASCITE_AL_SECONDO = 2

export interface OpzioniFolla {
  dt: number
  quartiere: Quartiere
  posGiocatore: Griglia
  /** Dove si può stare in piedi: lo sa la mappa, non lo scontro. */
  calpestabile: (x: number, y: number) => boolean
  /** Il caso, da 0 a 1. */
  caso: () => number
}

/** Quanta gente ci si aspetta di incrociare in questo quartiere. */
export function follaAttesa(quartiere: Quartiere): number {
  const { densita, ricchezza } = quartierePerId(quartiere)
  return Math.round(FOLLA_MASSIMA * (0.3 + densita * 0.4 + ricchezza * 0.3))
}

/**
 * Un giro di ricambio della folla.
 *
 * Prima si dimentica chi è finito lontano, poi si fa nascere qualcuno al bordo
 * del campo. I passanti già morti non tornano: quelli li ha tolti lo scontro, e
 * la clientela persa se la ricorda il mercato.
 */
export function aggiornaFolla(scontro: Scontro, opzioni: OpzioniFolla): Scontro {
  const { posGiocatore, dt } = opzioni

  const vivi = scontro.nemici.filter(
    (n) => n.tipo !== 'passante' || vicino(n.pos, posGiocatore, RAGGIO_OBLIO),
  )

  const passanti = vivi.filter((n) => n.tipo === 'passante').length
  const attesa = follaAttesa(opzioni.quartiere)
  const mancanti = attesa - passanti
  if (mancanti <= 0) return { ...scontro, nemici: vivi }

  const tentativi = Math.min(mancanti, Math.ceil(NASCITE_AL_SECONDO * dt * 10) / 10)
  if (opzioni.caso() > tentativi) return { ...scontro, nemici: vivi }

  // Strada quasi vuota: si riempie anche dentro l'inquadratura.
  const daVicino = passanti < attesa / 2
  const nato = nasce(scontro.prossimoId, opzioni, daVicino)
  if (!nato) return { ...scontro, nemici: vivi }

  return { ...scontro, nemici: [...vivi, nato], prossimoId: scontro.prossimoId + 1 }
}

/**
 * Far nascere un passante al bordo del campo.
 *
 * Si prova qualche punto a caso attorno al giocatore: se sono tutti dentro un
 * muro o in mezzo all'acqua, per stavolta non nasce nessuno. Insistere
 * costerebbe più di quanto vale un passante in più.
 */
function nasce(id: number, opzioni: OpzioniFolla, daVicino: boolean): Nemico | null {
  for (let tentativo = 0; tentativo < 6; tentativo++) {
    const angolo = opzioni.caso() * Math.PI * 2
    const distanza = daVicino
      ? RAGGIO_PRIMA_INFORNATA + opzioni.caso() * (RAGGIO_NASCITA - RAGGIO_PRIMA_INFORNATA)
      : RAGGIO_NASCITA
    const pos = {
      x: Math.round(opzioni.posGiocatore.x + Math.cos(angolo) * distanza),
      y: Math.round(opzioni.posGiocatore.y + Math.sin(angolo) * distanza),
    }
    if (!opzioni.calpestabile(pos.x, pos.y)) continue

    const rotta = opzioni.caso() * Math.PI * 2

    return {
      id,
      tipo: 'passante',
      pos: { x: pos.x + 0.5, y: pos.y + 0.5 },
      vita: 25,
      vitaMax: 25,
      arma: 'coltello',
      ricarica: 0,
      verso: { x: Math.cos(rotta), y: Math.sin(rotta) },
    }
  }

  return null
}

function vicino(a: Griglia, b: Griglia, raggio: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= raggio
}
