import type { Carriera } from '../engine/tipi'

const DB = 'casu-manager'
const STORE = 'carriere'
const CHIAVE = 'principale'

function apri(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => ko(req.error)
  })
}

async function operazione<T>(modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await apri()
  try {
    return await new Promise<T>((ok, ko) => {
      const req = f(db.transaction(STORE, modo).objectStore(STORE))
      req.onsuccess = () => ok(req.result)
      req.onerror = () => ko(req.error)
    })
  } finally {
    db.close()
  }
}

export const caricaCarriera = () => operazione<Carriera | undefined>('readonly', (s) => s.get(CHIAVE))
export const salvaCarriera = (c: Carriera) => operazione('readwrite', (s) => s.put(c, CHIAVE))
export const eliminaCarriera = () => operazione('readwrite', (s) => s.delete(CHIAVE))

export function esportaCarriera(c: Carriera, nomeClub: string) {
  const blob = new Blob([JSON.stringify(c)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `carriera-${nomeClub.toLowerCase()}-${c.stagione}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function leggiFileCarriera(file: File): Promise<Carriera> {
  const c = JSON.parse(await file.text()) as Carriera
  if (c?.versione !== 1 || !c.giocatori || !c.calendario || !c.clubUtente) {
    throw new Error('Il file non è un salvataggio valido')
  }
  return c
}
