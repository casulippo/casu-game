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

Life simulator sandbox in vista isometrica. Design in `CasuGame_Brief.md`,
architettura e comandi in `README.md`.

Regola non negoziabile: la logica di gioco sta in `src/engine/`, senza DOM né
canvas, e nasce con i suoi test.
