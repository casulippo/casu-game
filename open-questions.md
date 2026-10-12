# Domande aperte

## Scaricamento dati di tutti i campionati

API-Football gratis concede 100 chiamate al giorno: bastano per poche leghe. Per tutti i campionati due strade:

- scaricare piano piano, qualche lega al giorno (settimane per completare);
- abbonamento a pagamento.

Da decidere più avanti.

## Stagioni incluse nel piano gratuito di API-Football

Il piano gratuito limita le stagioni accessibili, ma non è chiaro quali. Da verificare con una chiave di prova: se la stagione in corso è esclusa, il piano gratuito non basta.

## Stipendi dei giocatori

Servono per tutti i giocatori di tutti i campionati. Verificato il 2026-10-12:

- Capology, FBref (stipendi presi da Capology) e Spotrac bloccano gli accessi automatici (Cloudflare).
- Capology ha un'API ufficiale, ma a pagamento; gratis solo una demo limitata alla Premier League. Prezzo da verificare.
- Nei campionati minori gli stipendi spesso non sono pubblici.

Ipotesi: addestrare un modello di ML su stipendi reali e usarlo per stimare quelli degli altri giocatori (da valore di mercato, età, ruolo, club, campionato, statistiche). Dati reali per l'addestramento:

- Serie A: lista annuale degli stipendi della Gazzetta.
- Premier League: demo gratuita dell'API Capology (da verificare cosa include l'accesso "limitato").

Rischio: con soli due campionati il modello sbaglia i livelli salariali degli altri. Correzione possibile: tarare le stime sul monte stipendi totale di ogni campionato, pubblicato nei rapporti UEFA sulle finanze dei club. Da verificare che quei rapporti coprano abbastanza leghe.

## Modello per attributi e overall

Nessuna fonte dà attributi stile FM (tiro, finalizzazione, contrasto...): vanno ricavati dalle statistiche reali. Idea di partenza:

- ogni attributo (1-20) deriva da una o più statistiche ogni 90 minuti, convertite in percentile rispetto ai giocatori dello stesso ruolo (es. finalizzazione da gol su tiri; tiro da tiri in porta ogni 90');
- l'overall (1-100) è la media degli attributi pesata per ruolo: stesso giocatore, ruolo diverso, overall diverso.

Da progettare attributo per attributo. Dubbi aperti:

- quali statistiche alimentano ogni attributo, e con che pesi;
- giocatori con pochi minuti giocati (statistiche poco affidabili);
- confronto tra campionati di livello diverso (un percentile in Serie A non vale uno in Serie B);
- attributi senza statistiche dirette (carattere, leadership, visione di gioco).

Ipotesi: usare i dataset FIFA 15-23 come riferimento. Un modello impara la relazione tra statistiche reali di una stagione e attributi FIFA della stessa stagione, poi la applica ai giocatori di oggi. Così pesi e scala non li inventiamo noi. Usare più stagioni per giocatore, non una sola: voti più stabili, e meno problemi con chi ha giocato pochi minuti in un anno.

Punti critici:

- il modello eredita i difetti dei voti EA (soggettivi, gonfiati dalla fama, in ritardo sul rendimento);
- servono statistiche dettagliate (tackle, passaggi, dribbling) delle stagioni 2014-2023: Transfermarkt ha solo gol, assist e minuti; da capire se API-Football gratis copre quelle stagioni, altrimenti c'è il dataset FBref 2017-2024 su Kaggle (solo top 5 campionati);
- abbinare lo stesso giocatore tra FIFA e le altre fonti (nomi scritti in modo diverso);
- leadership, carattere e simili restano non ricavabili dalle statistiche.

## Transfermarkt fermo a luglio 2026

Il database pubblico di `transfermarkt-datasets` non si aggiorna dal 6 luglio 2026, senza data di ripresa. Valori di mercato, contratti e trasferimenti invecchiano: serve una fonte alternativa se gli aggiornamenti non ripartono.
