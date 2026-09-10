/**
 * Il livello del giocatore.
 *
 * Non si sale combattendo: si sale incassando. È una soglia raggiunta, non un
 * saldo — chi arriva a 100 € e poi si fa arrestare resta di livello 2, con la
 * tasca vuota.
 *
 * Il livello regola tre cose sole: quanta roba il bazar è disposto a vendere,
 * quanti nascondigli si possono tenere attivi, e da quando si assumono gli
 * spaccini.
 */

/**
 * Quanto bisogna aver incassato per salire di livello.
 *
 * La prima soglia è quella della storia: 100 € e arriva l'SMS del bazar. Le
 * altre salgono in fretta perché la prima fornitura seria — 200 g rivenduti a
 * dieci al grammo — vale già un paio di migliaia di euro: soglie ravvicinate si
 * brucerebbero tutte in una giornata di gioco.
 */
export const SOGLIE_LIVELLO = [100, 1_500, 5_000, 20_000, 60_000, 150_000]

/** Il livello massimo raggiungibile. */
export const LIVELLO_MASSIMO = SOGLIE_LIVELLO.length + 1

/** Il livello che spetta a chi ha incassato questa cifra dall'inizio. */
export function livelloPer(incassoTotale: number): number {
  let livello = 1
  for (const soglia of SOGLIE_LIVELLO) {
    if (incassoTotale < soglia) break
    livello++
  }
  return livello
}

/** Quanto manca alla prossima soglia, o null se si è già in cima. */
export function mancanoAllaProssima(incassoTotale: number): number | null {
  const prossima = SOGLIE_LIVELLO[livelloPer(incassoTotale) - 1]
  return prossima === undefined ? null : prossima - incassoTotale
}

/**
 * Il tetto giornaliero del bazar, in grammi.
 *
 * Il Tridente non vende all'infinito: hanno paura che il giocatore gli rubi la
 * piazza. Si parte da 40 g e si arriva a 400.
 */
const TETTI = [40, 80, 120, 200, 300, 400, 400]

export function tettoBazar(livello: number): number {
  return TETTI[Math.min(Math.max(livello, 1), LIVELLO_MASSIMO) - 1]
}

/**
 * Quanti nascondigli si possono tenere riforniti contemporaneamente.
 *
 * È l'unica assicurazione contro arresti e sconfitte, quindi cresce piano:
 * regalarne troppi presto toglierebbe peso alla perdita.
 */
const NASCONDIGLI = [2, 3, 5, 8, 12, 20, 20]

export function nascondigliAttivi(livello: number): number {
  return NASCONDIGLI[Math.min(Math.max(livello, 1), LIVELLO_MASSIMO) - 1]
}

/** Gli spaccini si assumono dal livello 3. */
export function puoAssumereSpaccini(livello: number): boolean {
  return livello >= 3
}
