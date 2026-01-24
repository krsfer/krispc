-- Initial schema for Emoty Web Application
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE achievement_category AS ENUM ('pattern_creation', 'social_engagement', 'exploration', 'ai_interaction', 'accessibility', 'special');

-- Users table - Core user information and progression
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(100),
    avatar_url TEXT,
    user_level user_level NOT NULL DEFAULT 'beginner',
    reputation_score INTEGER NOT NULL DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    total_patterns_created INTEGER NOT NULL DEFAULT 0,
    favorite_palettes TEXT[], -- Array of palette IDs
    accessibility_preferences JSONB DEFAULT NULL,
    language_preference VARCHAR(2) NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'fr')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Patterns table - User-created emoji patterns
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sequence TEXT NOT NULL, -- JSON array of emoji characters
    palette_id VARCHAR(50) NOT NULL, -- References palette from frontend
    size INTEGER NOT NULL CHECK (size > 0),
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_ai_generated BOOLEAN NOT NULL DEFAULT false,
    generation_prompt TEXT,
    tags TEXT[], -- Array of tags for search
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Achievements table - Define all possible achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    description_en TEXT NOT NULL,
    description_fr TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL, -- Emoji or icon identifier
    required_level user_level NOT NULL,
    category achievement_category NOT NULL,
    points_value INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User achievements table - Track which achievements users have unlocked
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    progress_value INTEGER DEFAULT NULL, -- For progressive achievements
    UNIQUE(user_id, achievement_id)
);

-- Pattern favorites table - Track user favorites
CREATE TABLE pattern_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, pattern_id)
);

-- User sessions table - Track user sessions for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(user_level);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_patterns_user_id ON patterns(user_id);
CREATE INDEX idx_patterns_public ON patterns(is_public);
CREATE INDEX idx_patterns_palette ON patterns(palette_id);
CREATE INDEX idx_patterns_created_at ON patterns(created_at DESC);
CREATE INDEX idx_patterns_likes ON patterns(like_count DESC);
CREATE INDEX idx_patterns_tags ON patterns USING GIN(tags);

CREATE INDEX idx_achievements_key ON achievements(achievement_key);
CREATE INDEX idx_achievements_level ON achievements(required_level);
CREATE INDEX idx_achievements_category ON achievements(category);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);

CREATE INDEX idx_pattern_favorites_user_id ON pattern_favorites(user_id);
CREATE INDEX idx_pattern_favorites_pattern_id ON pattern_favorites(pattern_id);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at 
    BEFORE UPDATE ON patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial achievements
INSERT INTO achievements (achievement_key, name_en, name_fr, description_en, description_fr, icon, required_level, category, points_value) VALUES
-- Beginner achievements
('first_pattern', 'First Pattern', 'Premier Motif', 'Create your very first emoji pattern', 'Créez votre tout premier motif emoji', '🎯', 'beginner', 'pattern_creation', 10),
('pattern_master', 'Pattern Master', 'Maître des Motifs', 'Create 10 emoji patterns', 'Créez 10 motifs emoji', '🏆', 'beginner', 'pattern_creation', 25),
('explorer', 'Explorer', 'Explorateur', 'Try 5 different palettes', 'Essayez 5 palettes différentes', '🧭', 'beginner', 'exploration', 15),

-- Intermediate achievements
('ai_assistant', 'AI Assistant', 'Assistant IA', 'Generate your first AI pattern', 'Générez votre premier motif IA', '🤖', 'intermediate', 'ai_interaction', 20),
('voice_commander', 'Voice Commander', 'Commandant Vocal', 'Use 5 voice commands', 'Utilisez 5 commandes vocales', '🎤', 'intermediate', 'accessibility', 30),
('social_butterfly', 'Social Butterfly', 'Papillon Social', 'Share 3 patterns with friends', 'Partagez 3 motifs avec des amis', '🦋', 'intermediate', 'social_engagement', 25),

-- Advanced achievements
('accessibility_champion', 'Accessibility Champion', 'Champion Accessibilité', 'Use all accessibility features', 'Utilisez toutes les fonctionnalités d''accessibilité', '♿', 'advanced', 'accessibility', 50),
('pattern_architect', 'Pattern Architect', 'Architecte de Motifs', 'Create 50 unique patterns', 'Créez 50 motifs uniques', '🏗️', 'advanced', 'pattern_creation', 75),
('multilingual', 'Multilingual', 'Multilingue', 'Use both English and French interfaces', 'Utilisez les interfaces anglaise et française', '🌍', 'advanced', 'exploration', 40),

-- Expert achievements
('pattern_legend', 'Pattern Legend', 'Légende des Motifs', 'Create 100 patterns and help 10 users', 'Créez 100 motifs et aidez 10 utilisateurs', '👑', 'expert', 'special', 100),
('ai_whisperer', 'AI Whisperer', 'Chuchoteur IA', 'Master all AI features and create custom prompts', 'Maîtrisez toutes les fonctionnalités IA et créez des invites personnalisées', '🧠', 'expert', 'ai_interaction', 80),
('community_leader', 'Community Leader', 'Leader Communautaire', 'Help onboard 5 new users', 'Aidez à intégrer 5 nouveaux utilisateurs', '🌟', 'expert', 'social_engagement', 90);

-- Create a view for user statistics
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.user_level,
    u.reputation_score,
    u.total_patterns_created,
    COUNT(DISTINCT ua.achievement_id) as achievement_count,
    COUNT(DISTINCT pf.pattern_id) as favorite_count,
    u.created_at,
    u.last_login_at
FROM users u
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN pattern_favorites pf ON u.id = pf.user_id
GROUP BY u.id, u.username, u.user_level, u.reputation_score, u.total_patterns_created, u.created_at, u.last_login_at;