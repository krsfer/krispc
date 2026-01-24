import { Kysely, SqliteDialect, ParseJSONResultsPlugin, KyselyPlugin, PluginTransformResultArgs, QueryResult } from 'kysely';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from './types';

// Environment variable validation
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set, defaulting to sqlite.db');
}

const dbPath = DATABASE_URL || 'sqlite.db';

// Custom plugin to convert SQLite date strings to Date objects
class SqliteDateTransformer implements KyselyPlugin {
  transformQuery(args: any) { return args.node; }
  
  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<any>> {
    const { rows } = args.result;
    if (rows && rows.length > 0) {
      for (const row of rows) {
        for (const key in row) {
          // Check for keys ending in _at (timestamps)
          if (typeof row[key] === 'string' && key.endsWith('_at')) {
             const date = new Date(row[key]);
             // Only replace if it's a valid date
             if (!isNaN(date.getTime())) {
               (row as any)[key] = date;
             }
          }
        }
      }
    }
    return args.result;
  }
}

// Create Kysely instance with SQLite dialect
export const db = new Kysely<DatabaseType>({
  dialect: new SqliteDialect({
    database: new Database(dbPath),
  }),
  plugins: [
    new ParseJSONResultsPlugin(),
    new SqliteDateTransformer()
  ]
});

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Check if we can query the database
    // Using sqlite_master table which always exists
    await db.selectFrom('sqlite_master' as any).select('name').limit(1).execute();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await db.destroy();
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}