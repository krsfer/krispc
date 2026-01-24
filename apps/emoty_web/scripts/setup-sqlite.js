const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const dbPath = process.env.DATABASE_URL || 'sqlite.db';

console.log('🚀 Setting up Emoty Web SQLite database...\n');

async function main() {
  try {
    const dbFile = path.resolve(process.cwd(), dbPath);
    console.log(`📡 Connecting to SQLite database at ${dbFile}...`);

    const db = new Database(dbFile);
    
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.log('📝 Initializing schema...');

    const migrationPath = path.join(process.cwd(), 'src/db/migrations/sqlite_init.sql');
    if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    db.exec(migrationSQL);

    console.log('✅ Schema initialized successfully!');

    // Verify tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    console.log('\n📊 Created tables:');
    tables.forEach(row => {
      console.log(`  ✓ ${row.name}`);
    });
    
    db.close();
    console.log('\n🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    process.exit(1);
  }
}

main();
