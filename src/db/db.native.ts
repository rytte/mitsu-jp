import { openDatabaseSync, type SQLiteBindParams } from 'expo-sqlite';

export const db = openDatabaseSync('app.db');

export async function run(sql: string, params: SQLiteBindParams = []) {
  return db.runAsync(sql, params);
}

export async function getAll<T>(sql: string, params: SQLiteBindParams = []): Promise<T[]> {
  return db.getAllAsync<T>(sql, params);
}

export async function getFirst<T>(sql: string, params: SQLiteBindParams = []): Promise<T | null> {
  return db.getFirstAsync<T>(sql, params);
}

