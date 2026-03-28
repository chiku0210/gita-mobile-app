import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = SQLite.openDatabaseSync('gita.db');
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}
