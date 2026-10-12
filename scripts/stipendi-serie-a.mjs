import { mkdir, writeFile } from 'node:fs/promises'

const STAGIONE = '2026-27'
// Aliquote italiane per redditi alti: il lordo vale circa 1,85 volte il netto.
const LORDO_SU_NETTO = 1.85

const CLUB = {
  Atalanta: 'atalanta-tutti-gli-stipendi-dei-nerazzurri-606806',
  Bologna: 'bologna-ingaggi-giocatori-stipendi-606808',
  Cagliari: 'cagliari-ecco-tutti-gli-ingaggi-606681',
  Como: 'como-2024-25-gli-ingaggi-e-gli-stipendi-dei-calciatori-quanto-guadagnano-881833',
  Fiorentina: 'fiorentina-gli-ingaggi-di-tutti-i-giocatori-viola-606616',
  Frosinone: 'frosinone-ingaggi-e-stipendi-dei-giocatori-quanto-guadagnano-975447',
  Genoa: 'genoa-tutti-gli-ingaggi-dei-rossoblu-606709',
  Inter: 'inter-gli-stipendi-di-tutti-i-giocatori-quanto-guadagnano-81019',
  Juventus: 'juventus-tutti-gli-stipendi-dei-giocatori-606609',
  Lazio: 'lazio-tutti-gli-ingaggi-dei-biancocelesti-606688',
  Lecce: 'lecce-ecco-gli-stipendi-di-tutti-i-giocatori-606613',
  Milan: 'milan-gli-stipendi-dei-giocatori-quanto-guadagnano-659250',
  Monza: 'monza-ingaggi-e-stipendi-dei-giocatori-quanto-guadagnano-882877',
  Napoli: 'napoli-tutti-gli-stipendi-dei-giocatori-606663',
  Parma: 'parma-gli-ingaggi-di-tutti-i-giocatori-606611',
  Roma: 'roma-gli-stipendi-dei-giocatori-quanto-guadagnano-659259',
  Sassuolo: 'sassuolo-gli-ingaggi-dei-neroverdi-606816',
  Torino: 'torino-tutti-gli-stipendi-dei-giocatori-606619',
  Udinese: 'udinese-stipendi-ingaggi-giocatori-friulani-606713',
  Venezia: 'venezia-gli-stipendi-dei-giocatori-quanto-guadagnano-712512',
}
const CALCIO_E_FINANZA =
  'https://www.calcioefinanza.it/2026/09/08/giocatori-piu-pagati-serie-a-2026-2027-stipendi/'

const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

async function scarica(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

const entita = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>' }
const testo = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => entita[n] ?? m)
    .trim()

function righe(html) {
  const tabella = html.match(/<table[\s\S]*?<\/table>/)?.[0]
  if (!tabella) throw new Error('tabella non trovata')
  return [...tabella.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((tr) =>
    [...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) =>
      c[1].split(/<br\s*\/?>|<\/p>/).map(testo).filter(Boolean),
    ),
  )
}

const milioni = (s) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'))

const chiave = (nome) =>
  nome
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ø/g, 'o')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()

async function nettiCalcioEFinanza() {
  const netti = new Map()
  for (const [, nomi, club, stipendio] of righe(await scarica(CALCIO_E_FINANZA)).slice(1)) {
    nomi.forEach((nome, i) => netti.set(`${club[i]}|${chiave(nome)}`, milioni(stipendio[0])))
  }
  return netti
}

const netti = await nettiCalcioEFinanza()
const giocatori = []
const discordanze = []

for (const [club, slug] of Object.entries(CLUB)) {
  await pausa(1500)
  // Le tabelle Virgilio sono sempre lorde anche quando l'intestazione dice "netto": lo conferma il testo degli articoli.
  const dati = righe(await scarica(`https://sport.virgilio.it/${slug}`)).filter(
    (r) => r.length >= 2 && r[0][0] && /^\d+(,\d+)?$/.test(r[1][0] ?? ''),
  )
  for (const [[nome], [cifra]] of dati) {
    const lordo = milioni(cifra)
    const nettoReale = netti.get(`${club}|${chiave(nome)}`)
    if (nettoReale !== undefined && Math.abs(lordo / nettoReale - LORDO_SU_NETTO) > 0.15) {
      discordanze.push({ club, nome, lordo, netto: nettoReale, rapporto: +(lordo / nettoReale).toFixed(2) })
    }
    giocatori.push({
      club,
      giocatore: nome,
      nettoMln: nettoReale ?? +(lordo / LORDO_SU_NETTO).toFixed(2),
      lordoMln: lordo,
      fonte: nettoReale !== undefined ? 'calcioefinanza' : 'virgilio-lordo-convertito',
    })
  }
  console.log(`${club}: ${dati.length} giocatori`)
}

await mkdir('data', { recursive: true })
const file = `data/stipendi-serie-a-${STAGIONE}.json`
await writeFile(file, JSON.stringify({ stagione: STAGIONE, lordoSuNetto: LORDO_SU_NETTO, giocatori, discordanze }, null, 2))
console.log(`\n${giocatori.length} giocatori -> ${file}`)
console.log('Discordanze tra fonti:', discordanze)
