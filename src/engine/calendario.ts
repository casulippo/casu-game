import { rng } from './rng'
import type { Partita } from './tipi'

type Giornata = [casa: number, ospite: number][]

// Tabelle di Berger: ogni squadra alterna casa e trasferta con al massimo una doppietta nel girone.
function berger(n: number): Giornata[] {
  const fissa = n - 1
  const m = n - 1
  return Array.from({ length: m }, (_, g) => {
    const giornata: Giornata = [g % 2 ? [fissa, g] : [g, fissa]]
    for (let k = 1; k < n / 2; k++) {
      const a = (g + k) % m
      const b = (g - k + m) % m
      giornata.push(k % 2 ? [a, b] : [b, a])
    }
    return giornata
  })
}

function senzaTriple(andata: Giornata[], n: number): boolean {
  for (let squadra = 0; squadra < n; squadra++) {
    const seq = andata.map((g) => (g.some(([c]) => c === squadra) ? 'C' : 'T')).join('')
    const completa = seq + [...seq].map((c) => (c === 'C' ? 'T' : 'C')).join('')
    if (/CCC|TTT/.test(completa)) return false
  }
  return true
}

// Andata e ritorno; il ritorno ripete l'andata a campi invertiti, come in Serie A.
export function generaCalendario(clubIds: string[], seme: string): Partita[] {
  const r = rng(`calendario:${seme}`)
  const squadre = [...clubIds]
  for (let i = squadre.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[squadre[i], squadre[j]] = [squadre[j], squadre[i]]
  }
  if (squadre.length % 2) squadre.push('')
  const n = squadre.length
  const base = berger(n)
  // Ruotare l'ordine delle giornate sposta le doppiette: si prende la prima rotazione senza triple al giro di boa.
  const partenza = Math.floor(r() * base.length)
  let andata = base
  for (let s = 0; s < base.length; s++) {
    const ruotata = [...base.slice((partenza + s) % base.length), ...base.slice(0, (partenza + s) % base.length)]
    if (senzaTriple(ruotata, n)) {
      andata = ruotata
      break
    }
  }
  const partite: Partita[] = []
  andata.forEach((giornata, g) => {
    for (const [c, o] of giornata) {
      if (!squadre[c] || !squadre[o]) continue
      partite.push({ giornata: g + 1, casaId: squadre[c], ospiteId: squadre[o] })
    }
  })
  const ritorno = partite.map((p) => ({ giornata: p.giornata + n - 1, casaId: p.ospiteId, ospiteId: p.casaId }))
  return [...partite, ...ritorno]
}
