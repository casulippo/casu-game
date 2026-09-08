# CASU GAME — Project Brief per Claude Code

## CHI SEI E COSA DEVI FARE

Stai lavorando su **Casu Game**, un life simulator sandbox in visuale top-down con estetica pixel art urbana (16x16). Il progetto è sviluppato da una sola persona (data scientist, conosce Python e SQL) in vibe coding con Claude.

Il tuo compito è aiutare a costruire questo gioco passo per passo, sistema per sistema, partendo dalle fondamenta.

---

## STACK TECNOLOGICO

| Componente | Tecnologia | Note |
|---|---|---|
| Linguaggio | TypeScript | Un solo linguaggio dalla logica al deploy |
| Build tool | Vite | Dev server istantaneo, build statica |
| Rendering mappa | Phaser 3 | Tilemap, sprite, camera, collisioni |
| UI | React + Tailwind CSS | HUD, agenda, skill tree, dialoghi, menu |
| Stato | Zustand | Store centrale, ponte tra canvas e UI |
| Persistenza | IndexedDB (`idb-keyval`) | Stato serializzato in JSON, 3 slot |
| Test | Vitest | La logica di gioco è testata, non sperata |
| Mappe | Tiled | Editor esterno, export JSON letto da Phaser |
| Grafica | Asset pixel art con licenza commerciale | Nessun asset derivato da giochi esistenti |
| Deploy | Vercel | Sito statico, nessun backend |

### Principio architetturale fondamentale

**La logica di gioco non conosce né il DOM né il canvas.** Tutto ciò che sta in `src/engine/`
è TypeScript puro: funzioni che prendono uno stato e ne restituiscono uno nuovo. Questo
significa che memoria NPC, gossip, decadimento, economia e agenda si sviluppano e si
verificano con i test, senza aprire una finestra di gioco.

Phaser e React sono strati di presentazione sopra a quel motore. Se domani cambi renderer,
`engine/` non se ne accorge.

### Ambiente di sviluppo
- Node.js 20+ e `npm` — nessun Docker, nessun container
- `npm run dev` per il dev server, `npm test` per i test, `npm run build` per la build
- Deploy automatico su Vercel a ogni push
- Mappe autorate in Tiled (https://www.mapeditor.org), esportate in JSON dentro `public/maps/`

---

## VISIONE DEL GIOCO

Casu Game è un life simulator sandbox. Il giocatore arriva in città a 16 anni e vive fino a 99, costruendo la propria esistenza attraverso scelte morali, relazioni e ambizioni — legali o criminali.

**Pilastri del design:**
- Libertà totale: ogni percorso è valido, ogni combinazione possibile
- Conseguenze reali: le scelte hanno peso e memoria permanente
- Mondo vivo: NPC, economia e città evolvono indipendentemente dal giocatore
- Personalizzazione dell'esperienza: nessuna partita uguale a un'altra

---

## STRUTTURA TEMPORALE

- Ogni giorno di vita del personaggio = 60 minuti reali
- La giornata dura 24 ore di gioco — sonno incluso
- Non esistono slot rigidi: il giocatore ha un budget di ore da gestire liberamente

| Attività | Ore di Gioco | Tempo Reale |
|---|---|---|
| Turno di lavoro | 6-8 ore | ~10-13 min reali |
| Incontro con NPC | 1-2 ore | ~2-3 min reali |
| Girare il quartiere | 2-3 ore | ~3-5 min reali |
| Pasto | 1 ora | ~1-2 min reali |
| Sonno completo | 6-8 ore | ~10-13 min reali |
| Pisolino | 1-2 ore | ~2-3 min reali |

### Il Sonno
Il sonno è una meccanica attiva — non è automatico. Il giocatore decide quando e quanto dormire. Il debito è cumulativo.

| Situazione | Conseguenze |
|---|---|
| Sonno completo (6-8h) | Nessuna penalità, piena efficienza |
| 1-2 giorni senza dormire | Più lento, meno efficace nelle conversazioni |
| 3-4 giorni | Errori nelle decisioni, cerchia lo nota |
| 5-6 giorni | NPC reagiscono male, rischio svenimento |
| 7+ giorni | Collasso — giorni in ospedale, impegni saltati |

Il debito del sonno è cumulativo. Tre notti da 4 ore hanno lo stesso effetto di una notte in bianco. Dormire in luoghi non sicuri porta rischi aggiuntivi.

---

## IL PERSONAGGIO

### I Tre Background Iniziali
Il giocatore sceglie uno di 3 background che influenzano skill iniziali, soldi di partenza, relazioni già avviate e reputazione iniziale nei quartieri culturalmente affini.

| Background | Skill Iniziali | Soldi | Relazioni |
|---|---|---|---|
| Figlio di immigrati | Lingue, Adattamento, Resistenza fisica | Bassi | Comunità immigrata |
| Ragazzo di strada | Combattimento, Furtività, Rete criminale base | Minimi | Bassa malavita locale |
| Figlio di famiglia benestante | Gestione, Finanza, Carisma sociale | Medi | Ambienti legali e professionali |

### Personalizzazione
Il giocatore personalizza nome e aspetto all'inizio. Il background influenza come certi quartieri lo accolgono inizialmente.

### Progressione dell'Età
L'età non blocca percorsi professionali ma cambia abilità fisiche e mentali.

| Età | Fisico | Mente | Gameplay |
|---|---|---|---|
| 16-25 | Picco fisico | Apprendimento veloce, poca esperienza | Tutto possibile, nessuna rete |
| 25-40 | Forte e resistente | Esperienza cresce, skill solide | Espansione e consolidamento |
| 40-60 | Inizio declino fisico | Picco mentale, massima saggezza | Potere e influenza |
| 60-80 | Stanchezza, possibili malattie | Ancora lucido, più lento | Gestione dell'impero |
| 80-99 | Limitazioni serie | Declino cognitivo graduale | Solo gestionale — delega tutto |

**Da 80 anni in su**: il gameplay diventa prevalentemente gestionale. Il personaggio non può più svolgere azioni fisiche intense — deve delegare alla cerchia.

---

## LA CITTÀ

Città fittizia con atmosfera urbana mediterranea/americana — non una città reale. Composta da 4-6 quartieri con atmosfere molto diverse.

| Quartiere | Caratteristiche | Controllo |
|---|---|---|
| Centro storico | Attività legali, politica, media | Neutro / Conteso |
| Porto / Zona industriale | Traffici, lavoro pesante, contrabbando | Clan dominante |
| Periferia povera | Alta criminalità, spaccio, basse barriere | Conteso tra più clan |
| Quartiere residenziale | Famiglie, lavori medi, polizia attiva | Neutro |
| Zona ricca | Affari, investimenti, politica corrotta | Clan dominante (colletti bianchi) |
| Zona notturna | Locali, prostituzione, bische | Conteso |

### Evoluzione della Città
La città cambia nel tempo per effetto di due forze:
- Il tempo che passa (gentrificazione, declino, sviluppo naturale)
- Le azioni del giocatore (che può accelerare, bloccare o indirizzare i cambiamenti)

Le stagioni cambiano visivamente la mappa ma non influenzano il gameplay.

### Indice di Quartiere
Ogni quartiere ha un indice di valore che si muove nel tempo. Il giocatore lo vede in modo vago — un indicatore generale. I dettagli arrivano dagli NPC e dal broker.

- **Salgono**: nuove attività lecite, criminalità ridotta, investimenti pubblici
- **Scendono**: guerre tra bande, negozi che chiudono, speculazione aggressiva
- Il valore degli immobili dipende direttamente da questo indice

### Controllo del Territorio
Puoi conquistare il controllo di un quartiere intero tramite forza o diplomazia.
- Ricevi rendite passive dalla zona
- Hai potere decisionale sulle attività del quartiere
- Devi difenderlo con presenza fisica della cerchia + pagamenti periodici
- Se attaccato mentre non sei presente, la cerchia lo difende autonomamente

### I Veicoli
Funzionano come **viaggio rapido** — teletrasporto istantaneo verso location già visitate, selezionate da una mappa cittadina. Nessun gameplay di guida. Status symbol e strumento di spostamento rapido. Certi quartieri sono raggiungibili comodamente solo con un veicolo.

| Come ottenerli | Rischio |
|---|---|
| Acquisto legale | Nessuno |
| Noleggio | Nessuno |
| Furto | Aumenta livello di ricerca, non tracciabile a te |

---

## SISTEMA NPC E MEMORIA

### Pool degli NPC
Il gioco ha un pool fisso di 200+ NPC. I clienti illeciti, i dipendenti chiave, i contatti criminali rientrano tutti in questo pool — non sono figure aggiuntive.

| Tipo | Numero | Memoria | Comportamento |
|---|---|---|---|
| Principali | 30-40 | Completa su tutto | Routine dettagliata, relazioni profonde |
| Secondari | 80-100 | Eventi importanti | Routine semplice, reagiscono alle azioni |
| Folla | 100+ | Solo eventi estremi | Danno vita alla città |

### Sistema di Memoria
Tutti i 200+ NPC ricordano le azioni del giocatore per sempre, con una distinzione:
- **Testimone diretto**: ricordo pieno, peso massimo, decade lentamente
- **Sentito da altri**: ricordo parziale, peso minore, decade più velocemente

Il peso del ricordo decade nel tempo in base a:
- Comportamenti futuri del giocatore (positivi accelerano il decadimento)
- Gravità dell'evento
- Frequenza di contatto
- Influenza della rete sociale

| Tipo di Evento | Peso Iniziale | Decadimento |
|---|---|---|
| Spinta / litigio | 40 | ~30 giorni di buona condotta |
| Picchiato | 70 | ~90 giorni |
| Sparato / coltellata | 95 | Mai del tutto — resta sempre un fondo |
| Salvato la vita | +80 positivo | Non decade mai |

| Peso Residuo | Comportamento dell'NPC |
|---|---|
| >70 | Ti evita, chiude la porta, avvisa altri |
| 30-70 | Freddo, diffidente, non ti offre nulla |
| 10-30 | Cauto ma ci parla, non si fida ciecamente |
| <10 | Quasi dimenticato, torna quasi normale |

### Gli NPC Hanno una Vita Propria
- Hanno routine indipendenti — lavoro, svago, relazioni
- Parlano tra loro: la reputazione si diffonde nella rete sociale
- Invecchiano con il giocatore e muoiono di vecchiaia (con segnali in anticipo: si ammalano, rallentano)
- Alla morte, il loro ruolo viene ereditato da qualcuno della loro cerchia — nasce un nuovo NPC
- Nuovi NPC arrivano in città nel corso degli anni

### Clienti Fissi delle Attività Illecite
I clienti fissi sono NPC veri del pool. Tornano autonomamente se dipendenti o soddisfatti. Se li tratti male smettono di venire e lo comunicano agli altri NPC della loro rete.

### Dipendenze degli NPC
Le dipendenze si sviluppano gradualmente attraverso contatti ripetuti. Ogni NPC ha una soglia di vulnerabilità diversa.

- Primo contatto: curiosità
- 2-5 volte: abitudine
- 5-10 volte: dipendenza leggera
- 10+ volte: dipendenza pesante

Si sfruttano come leva economica, informativa o di controllo. Un dipendente che tocca il fondo muore — perdita permanente del contatto.

---

## ARCHITETTURA TECNICA DEL SISTEMA NPC

### Modello dati TypeScript

Non c'è un database. Lo stato del gioco è un unico oggetto TypeScript tenuto in memoria e
serializzato in IndexedDB al salvataggio. Con 200+ NPC e qualche migliaio di ricordi siamo
nell'ordine dei pochi MB: un database sarebbe complessità senza beneficio.

Il vantaggio: lo stato è tipizzato, quindi il compilatore trova gli errori che in SQL
scopriresti solo a runtime.

```typescript
// src/engine/state.ts

type Quartiere = 'centro' | 'porto' | 'periferia' | 'residenziale' | 'ricca' | 'notturna'
type TipoNPC = 'principale' | 'secondario' | 'folla'
type Sostanza = 'cannabis' | 'cocaina' | 'eroina' | 'sintetiche' | 'alcol' | 'gioco'

interface NPC {
  id: number
  nome: string
  tipo: TipoNPC
  quartiere: Quartiere
  routine: SlotRoutine[]      // orari e luoghi
  vulnerabilita: number       // soglia dipendenza, 0.0 - 1.0
  eta: number
  vivo: boolean
  dipendenze: Partial<Record<Sostanza, { livello: number; ultimoContatto: number }>>
}

interface Ricordo {
  id: number
  npcId: number
  tipoEvento: TipoEvento
  peso: number                // decade nel tempo
  pesoIniziale: number
  giornoEvento: number
  testimoneDiretto: boolean   // false = sentito da altri
}

interface Relazione {
  a: number
  b: number
  forza: number               // quanto si conoscono e si fidano, 0.0 - 1.0
}

interface MembroCerchia {
  npcId: number
  ruolo: Ruolo
  lealta: number
  competenza: number
  rischio: number
  pagamento: { tipo: 'stipendio' | 'percentuale' | 'prestazione'; importo: number }
}

interface Giocatore {
  nome: string
  background: 'immigrati' | 'strada' | 'benestante'
  eta: number
  soldiPuliti: number
  soldiSporchi: number
  reputazioneLegale: number
  reputazioneStrada: number
  livelloRicerca: 0 | 1 | 2 | 3 | 4
  casaPrincipale: number | null
}

// Lo stato completo del gioco — questo è ciò che viene salvato
interface GameState {
  giocatore: Giocatore
  tempo: { giorno: number; ora: number; anno: number }
  npcs: Record<number, NPC>
  ricordi: Ricordo[]
  relazioni: Relazione[]
  cerchia: MembroCerchia[]
  skill: Record<string, Skill>
  immobili: Immobile[]
  attivita: Attivita[]
  agenda: Impegno[]
  mondo: { indiciQuartiere: Record<Quartiere, number>; /* ... */ }
}
```

### Decadimento della Memoria
Il decadimento si calcola a fine giornata quando il giocatore dorme — una passata sull'array,
non in tempo reale.

```typescript
// src/engine/npc/memory.ts

const TASSO_DECADIMENTO: Record<string, number> = {
  sentito:     0.990,   // i pettegolezzi svaniscono in fretta
  aggressione: 0.995,
  sparato:     0.998,   // non si dimentica quasi mai
  default:     0.993,
}

/** Applica una notte di decadimento. Scarta i ricordi ormai svaniti. */
export function decadiRicordi(ricordi: Ricordo[]): Ricordo[] {
  return ricordi
    .map(r => ({
      ...r,
      peso: r.peso * (
        !r.testimoneDiretto
          ? TASSO_DECADIMENTO.sentito
          : TASSO_DECADIMENTO[r.tipoEvento] ?? TASSO_DECADIMENTO.default
      ),
    }))
    .filter(r => r.peso >= 1.0)
}
```

### Calcolo Atteggiamento NPC
Quando il giocatore incontra un NPC, si somma il peso dei suoi ricordi.

```typescript
export function atteggiamento(ricordi: Ricordo[], npcId: number): number {
  return ricordi
    .filter(r => r.npcId === npcId && r.peso > 1.0)
    .reduce((score, r) => score + (isNegativo(r.tipoEvento) ? -r.peso : r.peso), 0)
}

// score < -50  → NPC ti evita
// score -50/0  → NPC freddo, diffidente
// score 0/50   → NPC neutro
// score > 50   → NPC favorevole
```

### Gossip tra NPC
La propagazione avviene a fine giornata. Chi ha visto qualcosa lo racconta a chi si fida
abbastanza di lui, e il ricordo di seconda mano nasce già dimezzato.

```typescript
export function propagaGossip(
  ricordi: Ricordo[], relazioni: Relazione[], oggi: number,
): Ricordo[] {
  const testimonianzeDiOggi = ricordi.filter(
    r => r.giornoEvento === oggi && r.testimoneDiretto,
  )

  return testimonianzeDiOggi.flatMap(ricordo =>
    relazioni
      .filter(rel => rel.a === ricordo.npcId && rel.forza > 0.3)
      .map(rel => ({
        ...ricordo,
        npcId: rel.b,
        peso: ricordo.peso * rel.forza * 0.5,
        testimoneDiretto: false,
      })),
  )
}
```

**Perché questo conta:** ognuna di queste funzioni si verifica con un test. "Un pestaggio
pesa 70, dopo 90 giorni di buona condotta deve essere sceso sotto la soglia di ostilità" è
un'asserzione eseguibile, non una speranza. È il motivo principale per cui la logica sta
fuori dal motore grafico.

### Simulazione Ibrida della Vita degli NPC

| Situazione | Tipo di Simulazione | Quando |
|---|---|---|
| NPC nel tuo quartiere attuale | Dettagliata — si muovono sulla mappa | In tempo reale |
| NPC in altri quartieri | Leggera — aggiornano stato interno | Ogni ora di gioco |
| Tutti gli NPC | Batch — routine, relazioni, gossip | A fine giornata (quando dormi) |

---

## ROUTINE E AGENDA

### Il Loop Quotidiano
Tutto emerge dall'esplorazione e dalle relazioni — nessun menu missioni, nessuna bacheca.

1. Sveglia → vedi gli impegni fissi della giornata
2. Slot liberi → esplori la città a piedi, parli con NPC
3. Incontri NPC → conversazioni, offerte, gossip, affari
4. Prendi impegni → entrano nell'agenda futura
5. Rispetti gli impegni → costruisci reputazione e fiducia
6. Dormi → il mondo avanza (simulazione batch notturna)

### Sistema di Affidabilità
- Manchi una volta: avvertimento
- Manchi due volte: perdi il lavoro o il contatto
- Sei sempre puntuale: promozioni, più ore, più soldi
- Vale anche nella malavita

### Come Trovi Opportunità
Tutto passa dalle persone — nessuna bacheca:
- Un NPC al bar ti dice che cercano qualcuno al porto
- Ti fai vedere spesso in un quartiere → la gente inizia a conoscerti
- Hai una skill specifica → certi NPC te la chiedono direttamente

---

## SISTEMA DI SKILL

### Struttura
Albero ramificato — alcune skill ne sbloccano altre. Crescono automaticamente con l'uso, nessuna scelta manuale. Una skill acquisita resta per sempre. La struttura generale è visibile, i dettagli si sbloccano avvicinandosi.

| Percorso Legale | Percorso Criminale | Universali |
|---|---|---|
| Gestione aziendale | Furtività | Combattimento |
| Contabilità | Spaccio | Carisma |
| Diritto | Intimidazione | Negoziazione |
| Medicina | Hacking | Guida |
| Finanza | Contrabbando | Lingue |

Alcune skill sono esclusive a un percorso ma con tempo e sacrifici qualsiasi skill è imparabile. Hobby come palestra e studio accelerano la crescita. Le esperienze reali la consolidano.

---

## MINIGIOCHI

I minigiochi appaiono solo nei momenti ad alta tensione. Le skill e l'età modificano i parametri base — non il risultato diretto. Fallire ha conseguenze permanenti in certi contesti.

| Minigioco | Quando | Meccanica | Fallimento |
|---|---|---|---|
| Fuga a piedi | Polizia ti ferma in spazio aperto | Snake — navighi labirinto generato proceduralmente | Arrestato |
| Fuga in zona affollata | Polizia ti ferma tra la folla | Timing game — premi al momento giusto per svoltare | Arrestato |
| Scasso / Furto veicolo | Entri in posto chiuso o rubi auto | Timing game — fermi indicatore nella zona giusta | Allarme — polizia chiamata |
| Combattimento | Ogni turno di scontro fisico | QTE sopra ai turni — premi bene e fai più danno | Danno ridotto quel turno |

### Come le Skill Influenzano i Minigiochi

| Skill Alta | Effetto |
|---|---|
| Velocità fisica alta | Snake più veloce, zona timing più ampia |
| Furtività alta | Zona timing dello scasso più larga |
| Combattimento alto | QTE più lento, finestra più lunga |
| Età avanzata | Tutti i minigiochi diventano più difficili gradualmente |

---

## SISTEMA DI COMBATTIMENTO

Sistema a turni classico, in stile JRPG. Armi da fuoco e bianche differiscono solo nei danni — non nel sistema a turni.

| Elemento | Dettaglio |
|---|---|
| Mosse disponibili | 4-6 mosse base + speciali sbloccate dalle skill |
| Evoluzione mosse | Le skill le sbloccano, l'uso le potenzia |
| Chi va per primo | Agguato = primo garantito. Altrimenti: chi ha più velocità |
| Fuga | Possibile solo se hai più velocità dell'avversario |
| Gruppo | Puoi combattere con la cerchia al fianco — ordini o autonomia |
| QTE | Ogni turno hai un QTE opzionale per bonus danno |

### Status Negativi

| Status | Effetto |
|---|---|
| Ferito | Riduce stat fisiche temporaneamente |
| Spaventato | Riduce precisione e capacità di attacco |
| Avvelenato | Danno progressivo ogni turno |
| Stordito | Salta un turno |

### Conseguenze della Sconfitta
Dipende dal contesto e dalle ferite riportate:
- Rissa al bar: perdi conoscenza, ti risvegli con conseguenze
- Agguato: ferite serie che richiedono cure immediate
- Ferite mortali: ricarica dall'ultimo salvataggio

---

## SISTEMA LEGALE E PRIGIONE

### Essere Arrestato — Tre Vie per Uscire

| Via | Costo | Tempo | Note |
|---|---|---|---|
| Cauzione | Alto | Immediato | Paghi e sei libero subito |
| Avvocato | Variabile | Riduce pena/cauzione | Dipende dal rapporto costruito |
| Evasione improvvisata | Nessuno | Immediato | Alto rischio, diventi ricercato |
| Evasione pianificata | Risorse + tempo | Richiede preparazione | Molto più sicura |

### Livelli di Ricerca

| Livello | Effetti |
|---|---|
| ⭐ Basso | Qualche poliziotto ti riconosce |
| ⭐⭐ Medio | Pattuglie frequenti, NPC ti segnalano |
| ⭐⭐⭐ Alto | Polizia ovunque, amici si distanziano |
| ⭐⭐⭐⭐ Massimo | Forze speciali, nessun lavoro legale possibile |

Il livello scende col tempo se stai basso, o pagando contatti corrotti.

### L'Avvocato
Rapporto costruibile per caso in città:
- Pagamenti regolari: fiducia lenta ma costante
- Droga / regali: fiducia veloce ma lui rischia
- Favori dal lavoro legale: fiducia + debito reciproco
- Trascurarlo: si trova altri clienti
- Tradirlo: nemico per sempre

Con rapporto alto e soldi sufficienti può ottenere il **proscioglimento completo** — l'evento sparisce dal casellario ufficiale ma gli NPC presenti lo ricordano comunque. Il casellario è ripulibile completamente con un buon avvocato.

### La Vita in Prigione
- Ogni giorno di prigione dura 60 minuti reali come fuori
- NPC fissi con gerarchia interna, affari e protezioni
- Puoi costruire una rete criminale dentro — resta attiva fuori se la mantieni con risorse e contatti regolari
- Skill imparabili solo in prigione

### La Squadra Investigativa Speciale
- Si attiva quando diventi troppo noto
- Usa sorveglianza fisica, intercettazioni telefoniche, informatori
- Puoi scoprirlo in anticipo tramite tuoi informatori o segnali fisici nella città
- Chiamate normali intercettabili — app criptate no (ottenibili fisicamente o online sul mercato nero)

### La Polizia
- Pattuglie fisse per quartiere + intervento reattivo agli eventi
- Singoli agenti corrompibili (basso livello: rischioso e poco utile)
- Funzionari e capi: più utili e gestibili

---

## SISTEMA ECONOMICO

### Denaro Pulito vs Sporco

| Tipo | Dove si usa | Come si ottiene |
|---|---|---|
| Pulito | Banca, investimenti, acquisti normali | Lavoro legale, rendite, riciclaggio |
| Sporco | Solo contanti, mercato nero | Attività criminali |

### Attività Illecite
Gestione diretta o delegata alla cerchia in base al livello di potere. Certi business richiedono territorio, altri sono operabili ovunque con rischi diversi per quartiere. I clienti fissi sono NPC veri che tornano autonomamente se soddisfatti/dipendenti.

| Attività | Territorio | Rischio | Guadagno |
|---|---|---|---|
| Spaccio diretto | No | Alto | Immediato |
| Rete di pusher | Sì | Medio | Passivo |
| Estorsioni | Sì | Medio | Fisso periodico |
| Bische / prostituzione | Sì | Alto | Alto volume |
| Produzione droga | Sì (laboratorio) | Molto alto | Altissimo |
| Contrabbando | No (richiede porto) | Alto | Molto alto |

#### I 4 Tipi di Droga

| Tipo | Mercato | Dipendenza NPC | Rischio Produzione |
|---|---|---|---|
| Cannabis | Ampio, bassa soglia | Leggera | Basso |
| Cocaina | Medio-alto, clienti abbienti | Media | Medio |
| Eroina | Ristretto, alta fedeltà | Pesante | Alto |
| Sintetiche | Variabile, nuovi mercati | Rapida e intensa | Molto alto |

#### Produzione di Droga
- Piccole quantità: a casa propria (alto rischio se già sotto indagine)
- Produzione seria: laboratorio dedicato in location separata
- Richiede attrezzatura specifica e skill chimiche/tecniche
- Scoperta possibile solo se il giocatore è già sotto indagine

### Attività Lecite
Gestione dettagliata — apri, assumi personale, gestisci i conti. Puoi scegliere quanto essere coinvolto. I ruoli chiave sono NPC veri della cerchia. Il resto del personale è astratto. Ogni attività richiede licenze specifiche per tipo — corrompere il funzionario giusto accelera il processo.

| Tipo Attività | Licenza da | Copertura riciclaggio |
|---|---|---|
| Bar / ristorante | Comune + Sanità | Alta |
| Negozio al dettaglio | Comune | Media |
| Officina meccanica | Comune | Media |
| Locale notturno | Comune + Polizia | Alta |
| Studio professionale | Ordine professionale | Bassa |
| Immobili in affitto | Comune | Media |

### Il Riciclaggio
- Ogni attività ha un tetto massimo credibile di denaro riciclabile
- Superarlo insospettisce il fisco
- Il contabile ottimizza il processo — se trascurato può rubarti o ricattarti
- Più attività apri, più alto il tetto complessivo

### Fisco
- Controlli di routine periodici: prevedibili
- Indagini specifiche: se ci sono segnali sospetti
- Spendere troppo contante in posti sbagliati insospettisce

### La Banca
- Conto corrente: depositi e prelievi
- Prestiti: puoi indebitarti con interessi e scadenze
- Investimenti finanziari: azioni, fondi, mercato immobiliare
- Puoi perdere tutto con investimenti sbagliati (ci sono segnali di allarme prima)
- NPC possono manipolare il mercato a tuo danno se sei abbastanza ricco

### Investimenti Finanziari
Il mercato si muove **solo su eventi rilevanti della città** — non ogni giorno. Questo lo rende narrativamente sensato e tecnicamente leggero.

- Elezioni → mercato immobiliare si muove
- Guerra tra bande → azioni locali scendono
- Quartiere riqualificato → tutto sale
- Blitz polizia → certi titoli crollano

Il **broker** è un NPC dedicato che trovi in città. Ti dice cosa sta per succedere nella città — tu interpreti e decidi dove investire. Non dà consigli diretti sugli strumenti.

### Gli Immobili
Le case si comprano per vivere o per scopi operativi — non come trading.

- **Casa principale**: dove vivi, puoi invitare NPC, costruisce relazioni
- **Case extra**: tutte abitabili come rifugio. Solo quelle di valore alto affittabili a NPC
- **Speculazione aggressiva** (sfratti, alzare affitti): possibile ma danneggia la reputazione pubblica
- Il valore dipende dall'indice di quartiere e dal tempo — non da interventi diretti

---

## LA CERCHIA

Non assumi persone — le conquisti nel tempo. Il gestore di un'attività è un membro della cerchia che ci metti a capo — non una figura separata. Un dipendente esterno può entrare nella cerchia su **tua scelta attiva** dopo aver costruito sufficiente fiducia.

| Ruolo | Lato | Funzione |
|---|---|---|
| Avvocato | Legale | Difesa, proscioglimento, casellario |
| Contabile | Legale | Riciclaggio ottimizzato |
| Broker | Legale | Informazioni privilegiate su città e mercato |
| Gestore attività | Legale | Gestisce attività in tua assenza |
| Informatore | Entrambi | Avvisa sui movimenti della città |
| Pusher | Criminale | Vende droga per te |
| Guardia del corpo | Criminale | Protezione fisica |
| Corriere | Criminale | Trasporta senza rischio per te |
| Hacker | Criminale | Sistemi, prove, comunicazioni |
| Corrotto | Criminale | Poliziotto/funzionario nella tua tasca |

### Gestione
- Ogni membro ha: Lealtà, Competenza, Rischio
- Pagamento: stipendio fisso (operativi), percentuale (gestionali), a prestazione (professionali)
- I tradimenti danno segnali prima — puoi prevenirli con lealtà alta o conoscendo i loro segreti
- Possono morire in scontri o missioni pericolose
- Nessun limite di numero — più sei potente, più ne hai

### Gerarchia
- Fidati di primo livello: sanno tutto
- Livelli intermedi: sanno solo quello che serve
- Pedine: non sanno nemmeno chi sei davvero — se arrestate, non parlano

### Dinamiche Interne
I membri interagiscono tra loro anche senza di te:
- Possono diventare amici (lealtà al gruppo aumenta)
- Possono sviluppare rivalità (devi gestire i conflitti)
- Possono formare sottogruppi (pericoloso se la tua lealtà cala)

---

## FAMIGLIA E RELAZIONI

### Come Nascono
Le relazioni romantiche nascono dalle conversazioni e si consolidano con azioni dedicate (cene, regali, tempo trascorso insieme). Puoi avere più relazioni contemporaneamente — gli NPC possono scoprirlo e reagire male.

### Struttura Familiare
- Puoi sposarti, convivere o tenere relazioni informali
- Puoi avere figli senza essere sposato (diverse conseguenze sociali)
- Il numero di figli dipende dalle tue risorse, dal partner e dalla casa

### Vantaggi Concreti

| Membro | Vantaggi |
|---|---|
| Partner | Secondo reddito, rete sociale estesa, copertura rispettabilità |
| Partner professionale | Accesso scontato ai suoi servizi |
| Figli adolescenti | Entrano nella cerchia se coinvolti presto |
| Figli adulti | NPC autonomi con skill proprie, ereditano attività |

### I Rischi
- I nemici possono rapire o minacciare la famiglia
- Il partner può scoprire il doppio binario e andarsene portando via la sua rete
- Un figlio trascurato si allontana — in casi estremi diventa nemico
- Mantenere la famiglia costa — pressione economica costante

### Protezione Famiglia
- Protezione fisica: guardie del corpo, case sicure
- Protezione indiretta: la reputazione scoraggia gli attacchi

### I Figli
Diventano NPC autonomi prima se li coinvolgi prima. Puoi influenzare attivamente il loro percorso ma hanno una personalità propria. Alla tua morte vanno al partner superstite o alla cerchia in base ai legami. Un figlio trascurato può diventare nemico solo in casi estremi.

---

## LA CASA

| Tipo | Effetti sul Gameplay |
|---|---|
| Stanza in affitto | Minimo. Nessuno spazio per ospiti |
| Appartamento | Puoi invitare NPC, costruire rapporti in casa |
| Villa | Status elevato, spazio per cerchia |
| Rifugio sicuro | Nasconde te o oggetti sensibili dalla polizia |
| Casa di copertura | Usata per attività illegali o come base operativa |

Puoi avere più case contemporaneamente. Dove dormi le prime notti dipende dal background — chi non ha base iniziale può chiedere ospitalità agli NPC se ha già un rapporto.

---

## INTERNET E TELEFONO

### Il Telefono
- Non tutti gli NPC preferiscono il telefono — alcuni vogliono incontri di persona
- Chiamate normali: intercettabili dalla polizia se sei sotto indagine
- App criptate: sicure, ottenibili fisicamente o sul mercato nero online
- Puoi capire di essere intercettato da segnali fisici o tramite informatori

### Internet
Navigare è libero e senza rischi. Le operazioni avanzate richiedono skill specifiche o un hacker nella cerchia.

| Uso | Requisiti |
|---|---|
| Comunicazioni quotidiane | Nessuno |
| Mercato nero online | Contatti o skill |
| Reputazione digitale | Automatico — dipende dalle azioni reali |
| Hacking e accesso sistemi | Hacker in cerchia |

### Il Mercato Nero
- Fisico: location specifica nella città per certi prodotti (armi pesanti, documenti falsi)
- Online: accessibile da telefono o computer per altri prodotti
- I prezzi fluttuano in base agli eventi della città

---

## SALUTE E DIPENDENZE

| Aspetto | Gestione Sana | Trascurato |
|---|---|---|
| Alimentazione | Bonus a stat fisiche e sociali | Penalità lievi dopo giorni consecutivi |
| Igiene | Nessun effetto | NPC ti trovano meno presentabile |
| Ferite lievi | Guariscono da sole | — |
| Ferite serie | Richiedono medico o cerchia | Limitano le azioni |

Le dipendenze personali nascono da eventi casuali — stress, trauma, offerta di un NPC. Chi ti conosce bene può usarle come leva contro di te. I nemici diretti che le scoprono le useranno sicuramente.

---

## POLITICA E MEDIA

La politica diventa fattore attivo solo quando sei abbastanza potente. Elezioni ogni 4 anni, anticipabili da scandali. Dopo le elezioni cambia tutto: economia, polizia, leggi, opportunità.

| Azione Politica | Effetto |
|---|---|
| Corrompere un candidato | Leggi e polizia più favorevoli |
| Candidarti direttamente | Potere istituzionale, doppia vita |
| Mettere un tuo candidato | Controllo indiretto senza esporti |

I giornalisti diventano problema concreto se commetti crimini eclatanti in pubblico. Puoi corromperli o intimidirli.

---

## LA DOPPIA REPUTAZIONE

Il giocatore ha due reputazioni separate:
- **Rispettabilità**: come ti vede il mondo legale
- **Rispetto di strada**: come ti vede la malavita

Le barre sono interne ma il feedback è visivo — il comportamento degli NPC riflette la tua posizione. Agli estremi le due reputazioni si escludono: essere troppo rispettabile chiude porte criminali e viceversa. Valori medi permettono entrambi i percorsi.

---

## VECCHIAIA E FINALE

### Sistema di Salvataggio
- Automatico ogni notte quando dormi
- Manuale in qualsiasi momento
- 3 slot disponibili — puoi tenere versioni diverse della tua vita
- Qualsiasi morte è ricaricarabile — il mondo si resetta completamente

### Il Finale a 99 Anni
- Scena narrativa basata sulle scelte fatte
- Pannello statistiche della tua legacy
- Opzionale: lasci una legacy per partita successiva con i tuoi figli come NPC adulti

---

## ARCHITETTURA — STRUTTURA DEL PROGETTO

Tre strati con una regola sola: **le frecce puntano verso il basso.** `engine/` non importa
mai da `game/` o `ui/`. È questo a tenere la logica testabile.

```
src/
├── engine/                  ← TypeScript puro. Zero DOM, zero canvas, 100% testato
│   ├── state.ts             ← tipi + stato iniziale
│   ├── time.ts              ← ore di gioco, giorni, anni, sonno
│   ├── npc/
│   │   ├── memory.ts        ← ricordi, decadimento, atteggiamento
│   │   ├── gossip.ts        ← propagazione nella rete sociale
│   │   ├── routine.ts       ← dove si trova un NPC a una data ora
│   │   └── dipendenze.ts    ← soglie, progressione, overdose
│   ├── economy.ts           ← denaro, attività, riciclaggio, mercato
│   ├── combat.ts            ← turni, danni, status
│   ├── legal.ts             ← polizia, ricerca, arresti, prigione
│   ├── skills.ts            ← albero, crescita con l'uso
│   ├── agenda.ts            ← impegni, affidabilità, conseguenze
│   ├── world.ts             ← quartieri, indici, controllo territorio
│   └── nightly.ts           ← simulazione batch notturna (il cuore del mondo vivo)
│
├── game/                    ← Phaser 3: tutto ciò che si vede sulla mappa
│   ├── scenes/CityScene.ts  ← tilemap, camera, collisioni
│   ├── PlayerSprite.ts      ← movimento top-down 4 direzioni
│   ├── NpcSprite.ts         ← NPC visibili, posizionati dalle routine
│   └── bridge.ts            ← unico punto di contatto con lo store
│
├── ui/                      ← React + Tailwind: tutto ciò che è interfaccia
│   ├── HUD.tsx              ← ora, soldi, stato, reputazioni
│   ├── Agenda.tsx           ← impegni del giorno
│   ├── SkillTree.tsx        ← albero skill
│   ├── Dialogo.tsx          ← conversazioni con NPC
│   ├── Telefono.tsx         ← contatti, mercato nero, app criptate
│   └── minigiochi/          ← Snake, Timing, QTE
│
├── store.ts                 ← Zustand: espone GameState a canvas e UI
├── persist.ts               ← salvataggio/caricamento IndexedDB, 3 slot
└── App.tsx                  ← monta il canvas Phaser e la UI React
```

### Come comunicano gli strati
Lo store Zustand è l'unico ponte. Phaser legge lo stato per sapere dove disegnare gli NPC
e scrive quando il giocatore interagisce; React si sottoscrive e si ridisegna da solo.
Nessuna chiamata diretta tra `game/` e `ui/` — è l'equivalente dei signal di Godot, ma
tipizzato.

---

## ORDINE DI SVILUPPO CONSIGLIATO

Costruisci un sistema alla volta in questo ordine — ogni sistema dipende dal precedente.

1. **Setup ambiente** — Vite + React + TS + Phaser + Tailwind, deploy Vercel funzionante da subito
2. **Movimento sulla mappa** — prima mappa in Tiled, personaggio che cammina con collisioni
3. **TimeSystem** — il tempo scorre, 60 min reali = 1 giorno
4. **Modello dati** — tipi in `state.ts`, NPC generati proceduralmente, salvataggio IndexedDB
5. **NPC visibili sulla mappa** — si muovono secondo routine
6. **Sistema di interazione** — parla con NPC, risposta base
7. **Sistema di memoria** — gli NPC ricordano le azioni
8. **Gossip tra NPC** — la reputazione si diffonde
9. **Agenda e impegni** — routine e conseguenze
10. **Sistema economico base** — soldi, lavoro, spese
11. **Combattimento** — sistema a turni + QTE
12. **Minigiochi** — Snake, Timing game
13. **Sistema legale** — polizia, arresti, prigione
14. **La cerchia** — gestione membri, lealtà
15. **Famiglia e relazioni** — partner, figli
16. **Economia avanzata** — riciclaggio, investimenti, attività
17. **Politica e media** — elezioni, giornalisti
18. **Vecchiaia e finale** — declino, legacy

---

## NOTE IMPORTANTI PER LO SVILUPPO

- **Non ottimizzare prematuramente** — prima fai funzionare, poi ottimizzi
- **`GameState` è la fonte di verità** — tutto lo stato del gioco vive lì, in un oggetto solo
- **La logica sta in `engine/`, sempre** — se una regola di gioco finisce in un componente
  React o in una scena Phaser, è nel posto sbagliato e diventerà impossibile da testare
- **Ogni sistema in `engine/` nasce con i suoi test** — è la scorciatoia, non il lavoro extra:
  verificare il decadimento della memoria con un test richiede secondi, farlo giocando richiede
  90 giorni di gioco simulato
- **La simulazione batch notturna** è il cuore del mondo vivo — curala bene
- **I minigiochi sono separati dal gameplay principale** — possono essere sviluppati in parallelo
- **Lo store Zustand è l'unico ponte** tra logica, canvas e UI — nessuna scorciatoia tra strati
- **Tutti gli asset devono avere licenza commerciale verificata** — niente materiale derivato da
  giochi esistenti. Tieni un file `ASSETS.md` con provenienza e licenza di ogni pacchetto usato:
  è la differenza tra poter pubblicare e non poterlo fare
