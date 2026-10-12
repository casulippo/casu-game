# Casu Manager

Gioco manageriale di calcio ispirato a Football Manager, per uso personale. Si allena una squadra
di Serie A 2026-27 con rose, valori di mercato, contratti e stipendi reali.

Gira tutto nel browser (Vite + React + TypeScript + Tailwind): il mondo iniziale è un database
SQLite (`public/seed.sqlite`) letto con sql.js, la carriera si salva in IndexedDB e si può
esportare/importare come file JSON.

## Comandi

```bash
npm run dev            # dev server su http://localhost:5173
npm test               # test del motore (calendario, partite, progressione)
npm run build          # build di produzione in dist/
npm run data:stipendi  # riscarica gli stipendi Serie A -> data/stipendi-serie-a-2026-27.json
npm run data:seed      # ricostruisce public/seed.sqlite (scarica Transfermarkt, ~210 MB, in data/raw/)
```

## Dati

| Dato | Fonte | Stato |
|---|---|---|
| Anagrafica, ruolo, valore, contratto, statistiche base | Transfermarkt (dataset pubblico `transfermarkt-datasets`) | reale, fermo a luglio 2026 |
| Stipendi | Virgilio Sport (lordi) + Calcio e Finanza (netti) | reale, settembre 2026 |
| Attributi 1-20 e overall | stimati da ruolo, valore ed età | provvisorio |
| 25 giocatori non presenti su Transfermarkt | inventati, tranne lo stipendio | marcati "stimato" |

Le decisioni ancora aperte sono in `open-questions.md`.

## Struttura

- `src/engine/` — logica pura: attributi, calendario, partita, classifica, progressione, carriera
- `src/data/` — caricamento del seed e salvataggi
- `src/ui/` — interfaccia
- `scripts/` — pipeline dati (Node)

## Deploy

Vercel, collegato al repository GitHub: ogni push su `main` pubblica. Build `npm run build`, output `dist/`.
