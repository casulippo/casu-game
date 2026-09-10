# SPACCIO CITY — design di riferimento

Questo documento sostituisce [`CasuGame_Brief.md`](./CasuGame_Brief.md), che resta in
archivio come materiale di partenza. Dove i due si contraddicono, vale questo.

Valuta unica: **euro**.

---

## 1. Il concept

Gioco in due dimensioni con visuale dall'alto: la mappa e gli sprite guardano a Pokémon
Smeraldo, i colori e l'atmosfera a Bully. Il protagonista si muove in una città criminale,
non in un mondo per bambini.

L'obiettivo è spacciare per fare più soldi possibile. Il denaro è insieme punteggio, mezzo
di sopravvivenza e chiave della progressione.

Il combattimento prende da Vampire Survivors l'idea delle orde — poliziotti o bande che
arrivano addosso in gruppo — ma **il colpo lo decide il giocatore**: si spara premendo, non
in automatico. Si schivano gli uomini e i proiettili e si risponde al fuoco. Si può sparare
a chiunque, passanti compresi.

Si comincia con il solo coltello. Poi si sblocca la pistola, che colpisce più forte e da
lontano. Da lì si aprono le altre armi dell'armeria e le altre droghe.

> Il sistema di combattimento a turni descritto nel vecchio brief è annullato: qui si combatte
> in tempo reale.

---

## 2. La città

La mappa è una sola, fissata così:

| Zona | Cosa c'è | Chi comanda |
|---|---|---|
| Nord-est | I palazzoni dove vive il protagonista, le case a schiera, il bazar dietro di esse | Tridente |
| Nord-ovest | Il parchetto, l'armeria del vecchietto | Bandelle di quartiere |
| Sud-est | Un quartiere intero, il mercato nero degli strumenti | Mafia |
| Ovest e centro | Quartieri ricchi e residenziali, presidio di polizia | Nessuno — piazza libera |

Il bazar del Tridente e i palazzoni sono **lo stesso posto**: si passa dietro le case a
schiera dove abiti e ci si arriva. Il rifornimento iniziale non avviene altrove.

### L'organizzazione del Tridente

In espansione: controlla tre quarti della città e sta provando a mettere piede anche nel
quartiere iniziale. Gestisce i palazzoni e il bazar, cioè il primo fornitore del giocatore.

### La mafia

Meno radicata del Tridente, ma possiede diversi immobili e un quartiere intero. Gestisce il
commercio delle droghe pesanti e, nel suo quartiere, il mercato nero degli strumenti.

Le due organizzazioni sono nemiche e si dividono la città.

### Le bandelle di quartiere

A nord-ovest ci sono solo piccole bande che seminano il panico. Sono loro a rovinare gli
affari dell'armiere, che perde la clientela rispettabile.

### La piazza libera

Ovest e centro non sono rivendicati da nessuno: lì si vende di più e si guadagna di più, ma
la sorveglianza è alta.

---

## 3. Il protagonista e la progressione

Vive da solo e all'inizio non ha ambizioni: vuole abbastanza soldi per sopravvivere.

Il livello sale quando si raggiunge una determinata somma **incassata**. È una soglia
raggiunta, non un saldo: se poi i soldi scendono, il livello resta.

- Livello 2 → 100 € incassati
- Soglie successive: da definire, insieme ai prezzi (vedi § 13)

Il livello regola tre cose:

1. quanta roba il bazar è disposto a vendere,
2. quanti nascondigli si possono tenere attivi contemporaneamente,
3. da quando si possono assumere gli spaccini (livello 3).

### Le statistiche

Quattro: **mira**, **vita**, **socialità**, **bellezza**. Non servono solo in combattimento,
influiscono anche sulla storia. Si alzano mangiando bene e con gli strumenti.

---

## 4. La roba

### Al bazar del Tridente

| Droga | Sblocco |
|---|---|
| Marijuana | da subito |
| MD | a 5.000 € |
| LSD | a 20.000 € |

Il bazar non vende all'infinito: hanno paura che il giocatore gli rubi la piazza. Il tetto
parte da 40 g e arriva a 400 g al crescere del livello, e si azzera solo tornando a casa a
mangiare e dormire, cioè a fine giornata.

Andando avanti nella storia si trovano altri punti di rifornimento, che permettono di
macinare guadagni senza dipendere dal solo bazar.

### Dalla mafia

Cocaina, crack, eroina.

---

## 5. Vendere in giro

Più il quartiere è ricco, più si vende e più si guadagna, ma più cresce la probabilità che la
polizia intervenga. Nei quartieri centrali e a ovest si arriva a trenta euro alla volta.

Le case dei ricchi e i parchetti sono i posti dove conviene fermarsi a lavorare.

Ogni passante colpito fa calare del 30% la quota di clienti che compra in giro. Sparare nel
mucchio costa caro sul lungo periodo — ed è la memoria degli NPC (§ 11) a ricordarselo.

---

## 6. Polizia, ricerca e raid

Finché si spaccia soltanto erba, farsi prendere significa cella e sequestro di tutti i soldi.

### Livello di ricerca

Il giocatore ha un livello di ricerca da 0 a 4 che sale con il suo comportamento: vendere nei
quartieri sorvegliati, sparare in pubblico, colpire agenti. Cala se si sta bassi.

**È il livello di ricerca a generare i raid.** I raid della storia sono scritti; tutti gli
altri sono conseguenza di come si è giocato, non eventi casuali.

### Raid

| Tipo | Come finisce |
|---|---|
| Da livello di ricerca | Evitabile: se si scappa **due minuti** senza farsi vedere, il raid rientra |
| Della storia | Vanno affrontati; in quelli seri i poliziotti vanno uccisi tutti |

Perdere uno scontro costa tutti i soldi e tutta la droga, sia addosso sia in casa. Si salva
solo quello che è nascosto in giro.

---

## 7. I nascondigli

Più di cinquanta posti in città dove nascondere droga e denaro. Più sale il livello, più punti
si possono tenere riforniti contemporaneamente.

È l'unica assicurazione contro arresti e sconfitte: quello che è nascosto non lo tocca nessuno.

---

## 8. Casa, cibo e giornata

In casa c'è un frigo, che va riempito di cibo. Mangiando bene si recuperano vita e statistiche.

Tornare a casa a mangiare e dormire chiude la giornata e riapre il credito al bazar.

---

## 9. Le categorie di oggetti

| Categoria | A cosa serve | Dove si compra |
|---|---|---|
| Cibo | Alza le statistiche e rimette in sesto | Negozi, frigo di casa |
| Droghe | La merce | Bazar del Tridente, mafia |
| Armi | Dal coltello in su | Armeria |
| Strumenti | Alzano le statistiche (giubbotto antiproiettile, il resto da definire) | Mercato nero, quartiere della mafia |

---

## 10. Gli spaccini

Dopo aver venduto erba due volte ai ragazzini dei parchetti, sono loro a chiedere di vendere
per te in cambio di una parte dei guadagni.

Assumibili dal livello 3. Gli si lascia metà della roba e versano soldi all'incirca ogni dieci
minuti: si ritira passando sopra di loro.

---

## 11. Cosa la città si ricorda

Due sistemi ereditati dal vecchio brief, perché reggono il malus dei passanti e la reputazione
di strada.

- **Memoria degli NPC.** Ogni NPC ricorda le azioni del giocatore con un peso che decade nel
  tempo. Un pestaggio pesa meno di una coltellata; una sparatoria non si dimentica quasi mai.
  Chi è stato testimone diretto ricorda meglio di chi l'ha sentito dire.
- **Gossip.** A fine giornata i ricordi si propagano nella rete sociale, dimezzati. È così che
  un colpo sparato in un quartiere chiude le porte anche in quello accanto.

Gli immobili e le case extra del vecchio brief **non** entrano: si sovrappongono ai nascondigli.

---

## 12. L'armeria e l'armiere

Il vecchietto è un ex delle forze speciali e vuole il Tridente fuori dal quartiere: dice che
le armi si importano da fuori e che così i suoi affari vanno a rilento.

C'è una contraddizione voluta — il giocatore la roba la compra dal Tridente. La prima banda
che pesta, però, è soltanto affiliata, quindi dopo quella missione al bazar non gli fanno storie.

Le armi si ottengono in due modi: comprandole, oppure sbloccandole facendo i suoi «favori».
Più la zona diventa tranquilla, più i prezzi scendono.

L'armiere è un personaggio fondamentale nella storia.

---

## 13. Il primo atto

**Ordine fissato: prima il parchetto, poi la polizia.**

1. **Il parchetto.** Per liberare la zona serve ripulirla: è il primo scontro, contro la banda
   avversaria che la controlla. Sono in quindici e c'è solo il coltello.
2. **La pistola.** Sistemati loro arriva il vecchietto, invita in armeria e regala la pistola,
   ringraziando: nella zona nord-ovest ci sono solo bandelle che gli fanno perdere la clientela
   rispettabile. Da lì nasce il patto: più la zona diventa tranquilla, più lui abbassa i prezzi.
3. **L'SMS del bazar.** Superati i 100 € di incasso si arriva al livello 2 e arriva un
   messaggio, sul display di un Nokia 3310:

   > «Hey, bro, ti chiamo perché oggi al bazar abbiamo dei prezzi speciali. Facci sapere se ti
   > serve qualcosa.»

   Si va verso i palazzoni e si passa dietro le case a schiera fino al bazar, dove vendono
   200 g a 100 €:

   > «Te la do solo perché ultimamente ti vedo in difficoltà, ma sei un bravo ragazzo. Questa
   > è buona, la puoi vendere anche a dieci al grammo.»

4. **Il primo raid della polizia.** Dopo aver girato altri cento euro circa: cappuccio in testa
   e si decide, scappare o sparare. La fuga dura come tutte le altre, due minuti.

Da qui in poi la storia è da scrivere.

---

## 14. Punti ancora aperti

- **I prezzi.** 200 g a 100 € rivenduti a dieci al grammo fanno venti volte la spesa: con la
  soglia del livello 2 a 100 €, il primo rifornimento brucia da solo mezza progressione. Da
  tarare insieme alle soglie, ed è la prima cosa da sistemare quando si scrive l'economia.
- **Le soglie di livello oltre la seconda.**
- **Il parchetto e lo spaccino.** La zona si ripulisce per far spacciare un ragazzino, ma gli
  spaccini arrivano a livello 3: o quel primo spaccino è un'eccezione di trama, o il parchetto
  si ripulisce per venderci di persona.
- **Quanto rende uno spaccino** e per quanto tempo gli dura la roba che gli si lascia.
- **Che effetto concreto hanno socialità e bellezza** sulla storia.
- **L'elenco degli strumenti** oltre al giubbotto antiproiettile.

---

## 15. Ordine di sviluppo

Ogni tappa nasce in `src/engine/` con i suoi test, prima di essere disegnata.

| # | Tappa | Moduli |
|---|---|---|
| 0 | Modello dati riscritto sul gioco nuovo | `state.ts` |
| 1 | Economia dello spaccio: roba, prezzi per zona, livelli a soglia | `droga.ts`, `spaccio.ts`, `livello.ts` |
| 2 | Nascondigli | `nascondigli.ts` |
| 3 | Combattimento in tempo reale (stato puro, `avanza(stato, dt)`) | `combattimento.ts`, `armi.ts` |
| 4 | Livello di ricerca, raid, fuga, arresto | `polizia.ts` |
| 5 | Mappa e fazioni, luoghi chiave | `quartieri.ts`, `luoghi.ts` |
| 6 | Bazar, armeria, mercato nero | `negozi.ts` |
| 7 | Statistiche, cibo, chiusura della giornata | `statistiche.ts`, `azioniCasa.ts` |
| 8 | Memoria degli NPC e gossip | `memoria.ts`, `gossip.ts` |
| 9 | Spaccini | `spaccini.ts` |
| 10 | Storia e SMS | `storia.ts` |

Alla fine della tappa 2 il gioco ha già un ciclo giocabile: comprare, vendere, nascondere.
