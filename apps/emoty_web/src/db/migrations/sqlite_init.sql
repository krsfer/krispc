-- SQLite Schema for Emoty Web

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    user_level TEXT NOT NULL DEFAULT 'beginner',
    reputation_score INTEGER NOT NULL DEFAULT 0,
    total_patterns_created INTEGER NOT NULL DEFAULT 0,
    favorite_palettes TEXT, -- JSON array
    accessibility_preferences TEXT, -- JSON
    language_preference TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT
);

-- Patterns
CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sequence TEXT NOT NULL,
    palette_id TEXT NOT NULL,
    size INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    is_ai_generated INTEGER NOT NULL DEFAULT 0,
    generation_prompt TEXT,
    tags TEXT, -- JSON array
    difficulty_rating INTEGER,
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    version INTEGER DEFAULT 1,
    parent_pattern_id TEXT REFERENCES patterns(id) ON DELETE SET NULL,
    complexity_score INTEGER,
    deleted_at TEXT,
    search_vector TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    achievement_key TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_fr TEXT NOT NULL,
    icon TEXT NOT NULL,
    required_level TEXT NOT NULL,
    category TEXT NOT NULL,
    points_value INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress_value INTEGER DEFAULT NULL,
    UNIQUE(user_id, achievement_id)
);

-- Pattern Favorites
CREATE TABLE IF NOT EXISTS pattern_favorites (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pattern_id)
);

-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Share Codes
CREATE TABLE IF NOT EXISTS share_codes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  code TEXT UNIQUE NOT NULL,
  pattern_id TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_data TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Collection tables (implied by 002_pattern_enhancements indexes)
CREATE TABLE IF NOT EXISTS pattern_collections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pattern_collection_items (
    collection_id TEXT NOT NULL REFERENCES pattern_collections(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (collection_id, pattern_id)
);

CREATE TABLE IF NOT EXISTS pattern_usage_stats (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    pattern_id TEXT REFERENCES patterns(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pattern_shares (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    pattern_id TEXT REFERENCES patterns(id) ON DELETE CASCADE,
    shared_by_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_patterns_user_id ON patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_public ON patterns(is_public);
CREATE INDEX IF NOT EXISTS idx_patterns_created_at ON patterns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);

-- Insert initial achievements
INSERT OR IGNORE INTO achievements (achievement_key, name_en, name_fr, description_en, description_fr, icon, required_level, category, points_value) VALUES
('first_pattern', 'First Pattern', 'Premier Motif', 'Create your very first emoji pattern', 'Créez votre tout premier motif emoji', '🎯', 'beginner', 'pattern_creation', 10),
('pattern_master', 'Pattern Master', 'Maître des Motifs', 'Create 10 emoji patterns', 'Créez 10 motifs emoji', '🏆', 'beginner', 'pattern_creation', 25),
('explorer', 'Explorer', 'Explorateur', 'Try 5 different palettes', 'Essayez 5 palettes différentes', '🧭', 'beginner', 'exploration', 15),
('ai_assistant', 'AI Assistant', 'Assistant IA', 'Generate your first AI pattern', 'Générez votre premier motif IA', '🤖', 'intermediate', 'ai_interaction', 20),
('voice_commander', 'Voice Commander', 'Commandant Vocal', 'Use 5 voice commands', 'Utilisez 5 commandes vocales', '🎤', 'intermediate', 'accessibility', 30),
('social_butterfly', 'Social Butterfly', 'Papillon Social', 'Share 3 patterns with friends', 'Partagez 3 motifs avec des amis', '🦋', 'intermediate', 'social_engagement', 25),
('accessibility_champion', 'Accessibility Champion', 'Champion Accessibilité', 'Use all accessibility features', 'Utilisez toutes les fonctionnalités d''accessibilité', '♿', 'advanced', 'accessibility', 50),
('pattern_architect', 'Pattern Architect', 'Architecte de Motifs', 'Create 50 unique patterns', 'Créez 50 motifs uniques', '🏗️', 'advanced', 'pattern_creation', 75),
('multilingual', 'Multilingual', 'Multilingue', 'Use both English and French interfaces', 'Utilisez les interfaces anglaise et française', '🌍', 'advanced', 'exploration', 40),
('pattern_legend', 'Pattern Legend', 'Légende des Motifs', 'Create 100 patterns and help 10 users', 'Créez 100 motifs et aidez 10 utilisateurs', '👑', 'expert', 'special', 100),
('ai_whisperer', 'AI Whisperer', 'Chuchoteur IA', 'Master all AI features and create custom prompts', 'Maîtrisez toutes les fonctionnalités IA et créez des invites personnalisées', '🧠', 'expert', 'ai_interaction', 80),
('community_leader', 'Community Leader', 'Leader Communautaire', 'Help onboard 5 new users', 'Aidez à intégrer 5 nouveaux utilisateurs', '🌟', 'expert', 'social_engagement', 90);
