#!/usr/bin/env node

/**
 * Database seeding script for Emoty Web Application
 * This script populates the database with sample data for development
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Parse DATABASE_URL or use individual config
let config;
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  config = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
} else {
  config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'emoty_web',
  };
}

console.log('🌱 Seeding Emoty Web database with sample data...\n');

async function seedDatabase() {
  const pool = new Pool(config);

  try {
    console.log('📊 Connecting to database...');

    // Check if database is already seeded
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('   To re-seed, clear the database first.');
      await pool.end();
      return;
    }

    console.log('👤 Creating sample users...');

    // Create sample users
    const users = [
      {
        email: 'demo@emoty.com',
        username: 'demo_user',
        full_name: 'Demo User',
        user_level: 'intermediate',
        reputation_score: 45,
        language_preference: 'en',
        accessibility_preferences: JSON.stringify({
          high_contrast: false,
          large_text: false,
          reduced_motion: false,
          screen_reader_mode: false,
          voice_commands_enabled: false,
          preferred_input_method: 'touch',
          color_blind_assistance: false
        })
      },
      {
        email: 'alice@example.com',
        username: 'alice_patterns',
        full_name: 'Alice Johnson',
        user_level: 'advanced',
        reputation_score: 75,
        language_preference: 'en',
        accessibility_preferences: JSON.stringify({
          high_contrast: true,
          large_text: false,
          reduced_motion: false,
          screen_reader_mode: false,
          voice_commands_enabled: true,
          preferred_input_method: 'voice',
          color_blind_assistance: false
        })
      },
      {
        email: 'pierre@exemple.fr',
        username: 'pierre_motifs',
        full_name: 'Pierre Dubois',
        user_level: 'expert',
        reputation_score: 92,
        language_preference: 'fr',
        accessibility_preferences: JSON.stringify({
          high_contrast: false,
          large_text: true,
          reduced_motion: true,
          screen_reader_mode: true,
          voice_commands_enabled: true,
          preferred_input_method: 'keyboard',
          color_blind_assistance: true
        })
      }
    ];

    const userIds = [];
    for (const user of users) {
      const result = await pool.query(`
        INSERT INTO users (email, username, full_name, user_level, reputation_score, language_preference, accessibility_preferences)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        user.email,
        user.username,
        user.full_name,
        user.user_level,
        user.reputation_score,
        user.language_preference,
        user.accessibility_preferences
      ]);
      userIds.push(result.rows[0].id);
    }

    console.log(`✅ Created ${users.length} sample users`);

    console.log('🎨 Creating sample patterns...');

    // Create sample patterns
    const patterns = [
      {
        user_id: userIds[0],
        name: 'Smiley Circle',
        sequence: JSON.stringify(['😀', '😊', '😄', '😃', '😆']),
        palette_id: 'smileys',
        size: 3,
        is_public: true,
        tags: ['happy', 'faces', 'beginner']
      },
      {
        user_id: userIds[1],
        name: 'Nature Harmony',
        sequence: JSON.stringify(['🌱', '🌿', '🍃', '🌳', '🌲']),
        palette_id: 'nature',
        size: 3,
        is_public: true,
        is_ai_generated: true,
        generation_prompt: 'Create a nature-themed pattern with growth progression',
        tags: ['nature', 'green', 'plants']
      },
      {
        user_id: userIds[2],
        name: 'Étoiles Magiques',
        sequence: JSON.stringify(['⭐', '🌟', '✨', '💫', '🌠']),
        palette_id: 'symbols',
        size: 3,
        is_public: true,
        tags: ['étoiles', 'magie', 'avancé']
      },
      {
        user_id: userIds[0],
        name: 'Food Fun',
        sequence: JSON.stringify(['🍕', '🍔', '🌮', '🍜', '🍱']),
        palette_id: 'food',
        size: 3,
        is_public: false,
        tags: ['food', 'fun', 'colorful']
      }
    ];

    const patternIds = [];
    for (const pattern of patterns) {
      const result = await pool.query(`
        INSERT INTO patterns (user_id, name, sequence, palette_id, size, is_public, is_ai_generated, generation_prompt, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        pattern.user_id,
        pattern.name,
        pattern.sequence,
        pattern.palette_id,
        pattern.size,
        pattern.is_public,
        pattern.is_ai_generated || false,
        pattern.generation_prompt || null,
        pattern.tags
      ]);
      patternIds.push(result.rows[0].id);
    }

    console.log(`✅ Created ${patterns.length} sample patterns`);

    console.log('🏆 Assigning sample achievements...');

    // Assign some achievements to users
    const achievements = await pool.query('SELECT id, achievement_key FROM achievements');
    const achievementMap = achievements.rows.reduce((map, ach) => {
      map[ach.achievement_key] = ach.id;
      return map;
    }, {});

    // Give demo user basic achievements
    await pool.query(`
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES 
        ($1, $2),
        ($1, $3)
    `, [
      userIds[0],
      achievementMap['first_pattern'],
      achievementMap['explorer']
    ]);

    // Give Alice intermediate achievements
    await pool.query(`
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES 
        ($1, $2),
        ($1, $3),
        ($1, $4),
        ($1, $5)
    `, [
      userIds[1],
      achievementMap['first_pattern'],
      achievementMap['pattern_master'],
      achievementMap['ai_assistant'],
      achievementMap['voice_commander']
    ]);

    // Give Pierre advanced achievements
    await pool.query(`
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES 
        ($1, $2),
        ($1, $3),
        ($1, $4),
        ($1, $5),
        ($1, $6),
        ($1, $7)
    `, [
      userIds[2],
      achievementMap['first_pattern'],
      achievementMap['pattern_master'],
      achievementMap['ai_assistant'],
      achievementMap['voice_commander'],
      achievementMap['accessibility_champion'],
      achievementMap['multilingual']
    ]);

    console.log('✅ Assigned achievements to users');

    console.log('⭐ Creating sample favorites...');

    // Create some pattern favorites
    await pool.query(`
      INSERT INTO pattern_favorites (user_id, pattern_id)
      VALUES 
        ($1, $2),
        ($1, $3),
        ($2, $1)
    `, [
      userIds[0], patternIds[1], // Demo user likes Nature Harmony
      userIds[0], patternIds[2], // Demo user likes Étoiles Magiques  
      userIds[1], patternIds[0]  // Alice likes Smiley Circle
    ]);

    console.log('✅ Created sample favorites');

    // Update pattern counts for users
    await pool.query(`
      UPDATE users 
      SET total_patterns_created = (
        SELECT COUNT(*) FROM patterns WHERE user_id = users.id
      )
    `);

    console.log('📊 Updated user statistics');

    await pool.end();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample data created:');
    console.log(`  👤 Users: ${users.length}`);
    console.log(`  🎨 Patterns: ${patterns.length}`);
    console.log(`  🏆 User achievements: 10`);
    console.log(`  ⭐ Favorites: 3`);
    console.log('\n🚀 Ready for development!');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    await pool.end();
    throw error;
  }
}

async function main() {
  try {
    await seedDatabase();
  } catch (error) {
    console.error('\n💥 Database seeding failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Ensure database schema is set up (run npm run db:setup)');
    console.log('  2. Check database connection');
    console.log('  3. Verify DATABASE_URL is correct');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Database seeding interrupted');
  process.exit(0);
});

main();