# Nuovo Progetto

Scheletro ripulito da Spaccio City: resta solo l'infra (Vite + React + TypeScript +
Tailwind, test con Vitest, deploy su Vercel). Codice e design del vecchio gioco sono
archiviati nei branch `spaccio-city` e `release/1.0.0`.

## Comandi

```bash
npm run dev      # dev server su http://localhost:5173
npm test         # test
npm run build    # build di produzione in dist/
npm run preview  # controlla la build di produzione in locale
```

## Deploy

Vercel riconosce Vite automaticamente: nessuna configurazione necessaria.
Build command `npm run build`, output `dist/`.
