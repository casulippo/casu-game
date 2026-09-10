# Istruzioni per Claude

## Stile delle risposte

**Sii sempre molto riassuntivo.** Vai dritto al punto.

- Poche righe, non paragrafi. Se bastano due frasi, usa due frasi.
- Niente riepiloghi di quello che hai appena fatto: il codice e i commit lo dicono già.
- Niente tabelle, elenchi o spiegazioni didattiche se non sono richiesti.
- Non rispiegare scelte tecniche già concordate.
- Segnala solo ciò che serve davvero sapere: errori, decisioni aperte, cose che ho
  chiesto di verificare.

Espanditi solo se te lo chiedo, o se stai segnalando un problema che non posso
capire senza contesto.

## Progetto

**Spaccio City**: arcade di spaccio in vista dall'alto, combattimento in tempo
reale. Design in `SpaccioCity.md`, architettura e comandi in `README.md`.
`CasuGame_Brief.md` è archivio: dove contraddice il design nuovo, non vale.

Regola non negoziabile: la logica di gioco sta in `src/engine/`, senza DOM né
canvas, e nasce con i suoi test.

La vista è piatta dall'alto su griglia ortogonale. Niente prospettiva obliqua o
isometrica, nemmeno negli asset.
