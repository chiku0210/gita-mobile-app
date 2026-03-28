import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// Singleton — opened once, reused everywhere
const sqlite = SQLite.openDatabaseSync('gita.db');
export const db = drizzle(sqlite, { schema });