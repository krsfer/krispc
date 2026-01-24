#!/usr/bin/env node

/**
 * Database setup script for Emoty Web Application
 * This script creates the PostgreSQL database and runs initial migrations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'emoty_web',
};

// Extract database name from DATABASE_URL if provided
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  config.host = url.hostname;
  config.port = parseInt(url.port) || 5432;
  config.user = url.username;
  config.password = url.password;
  config.database = url.pathname.slice(1); // Remove leading slash
}

console.log('🚀 Setting up Emoty Web database...\n');

async function createDatabase() {
  // Connect to PostgreSQL server (not specific database)
  const adminPool = new Pool({
    ...config,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    console.log(`📡 Connecting to PostgreSQL server at ${config.host}:${config.port}...`);
    
    // Check if database exists
    const dbCheckResult = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database]
    );

    if (dbCheckResult.rows.length === 0) {
      console.log(`📝 Creating database "${config.database}"...`);
      await adminPool.query(`CREATE DATABASE "${config.database}"`);
      console.log('✅ Database created successfully!');
    } else {
      console.log(`📋 Database "${config.database}" already exists.`);
    }

    await adminPool.end();
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    await adminPool.end();
    throw error;
  }
}

async function runMigrations() {
  // Connect to the target database
  const pool = new Pool(config);

  try {
    console.log(`📊 Running migrations on database "${config.database}"...`);

    // Read and execute migration file
    const migrationPath = path.join(__dirname, '../src/db/migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executing initial schema migration...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Verify tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Verify achievements were inserted
    const achievementsResult = await pool.query('SELECT COUNT(*) FROM achievements');
    console.log(`\n🏆 Inserted ${achievementsResult.rows[0].count} achievements`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    await pool.end();
    throw error;
  }
}

async function main() {
  try {
    await createDatabase();
    console.log('');
    await runMigrations();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('  1. Copy .env.example to .env.local');
    console.log('  2. Update DATABASE_URL in .env.local with your credentials');
    console.log('  3. Run: npm run dev');
    console.log('\n🔗 Connection details:');
    console.log(`  Host: ${config.host}`);
    console.log(`  Port: ${config.port}`);
    console.log(`  Database: ${config.database}`);
    console.log(`  User: ${config.user}`);

  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Ensure PostgreSQL is running');
    console.log('  2. Check your database credentials');
    console.log('  3. Verify DATABASE_URL format: postgresql://user:password@host:port/database');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Database setup interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Database setup terminated');
  process.exit(0);
});

main();