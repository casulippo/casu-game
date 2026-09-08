# Casu Game

Life simulator sandbox in visuale top-down. Il giocatore arriva in città a 16 anni e vive
fino a 99, costruendo la propria esistenza attraverso scelte morali, relazioni e ambizioni.

Il design completo è in [`CasuGame_Brief.md`](./CasuGame_Brief.md).

## Comandi

```bash
npm run dev      # dev server su http://localhost:5173
npm test         # test della logica di gioco
npm run build    # build di produzione in dist/
npm run preview  # controlla la build di produzione in locale
```

## Architettura

Tre strati, con una regola sola: **le frecce puntano verso il basso.**
`engine/` non importa mai da `game/` o da `ui/`.

```
src/
├── engine/    TypeScript puro. Zero DOM, zero canvas. È qui che vivono le regole del gioco
├── game/      Phaser: la mappa, il movimento, gli sprite
├── ui/        React + Tailwind: HUD, agenda, dialoghi, menu
└── store.ts   Zustand: l'unico ponte tra i tre strati
```

### Perché la logica sta separata

Tutto ciò che rende interessante questo gioco — la memoria degli NPC, il gossip che si
propaga, il decadimento dei rancori, l'economia — è logica pura. Tenendola fuori dal motore
grafico si verifica con i test invece che giocando:

> "Un pestaggio pesa 70; dopo 90 giorni di buona condotta deve essere sceso sotto la soglia
> di ostilità."

È un'asserzione che gira in millisecondi. Verificarla giocando richiederebbe 90 giorni di
gioco simulato.

Corollario pratico: se una regola di gioco finisce dentro un componente React o dentro una
scena Phaser, è nel posto sbagliato.

### Come comunicano gli strati

Phaser scrive nello store (il tempo che scorre, la posizione del giocatore), React si
sottoscrive e si ridisegna da solo. `game/` e `ui/` non si parlano mai direttamente.

## Stack

| Componente | Scelta |
|---|---|
| Build | Vite |
| Linguaggio | TypeScript |
| Mappa | Phaser 4 |
| UI | React 19 + Tailwind CSS 4 |
| Stato | Zustand |
| Persistenza | IndexedDB (`idb-keyval`) |
| Test | Vitest |
| Deploy | Vercel (build statica) |

## Deploy

Vercel riconosce Vite automaticamente: nessuna configurazione necessaria.
Build command `npm run build`, output `dist/`.

## Asset

Il gioco non contiene materiale derivato da altri giochi. Ogni pacchetto grafico va
registrato in `ASSETS.md` con provenienza e licenza, prima di essere usato.
