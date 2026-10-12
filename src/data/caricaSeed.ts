import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import { mondoDaRighe, QUERY, type Mondo } from './seed'

export async function caricaMondo(): Promise<Mondo> {
  const [SQL, file] = await Promise.all([
    initSqlJs({ locateFile: () => wasmUrl }),
    fetch('/seed.sqlite').then((r) => {
      if (!r.ok) throw new Error(`Database iniziale non disponibile (HTTP ${r.status})`)
      return r.arrayBuffer()
    }),
  ])
  const db = new SQL.Database(new Uint8Array(file))
  const righe = (sql: string) => {
    const [ris] = db.exec(sql)
    if (!ris) return []
    return ris.values.map((v) => Object.fromEntries(ris.columns.map((c, i) => [c, v[i]])))
  }
  try {
    return mondoDaRighe(righe(QUERY.meta), righe(QUERY.club), righe(QUERY.giocatori), righe(QUERY.statistiche))
  } finally {
    db.close()
  }
}
