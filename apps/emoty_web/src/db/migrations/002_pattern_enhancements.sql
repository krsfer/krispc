-- Pattern System Enhancements Migration
-- Migration: 002_pattern_enhancements.sql

-- Add pattern collections/folders support
CREATE TABLE pattern_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- hex color for collection theme
    is_public BOOLEAN NOT NULL DEFAULT false,
    pattern_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Junction table for patterns in collections
CREATE TABLE pattern_collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES pattern_collections(id) ON DELETE CASCADE,
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(collection_id, pattern_id)
);

-- Pattern usage statistics
CREATE TABLE pattern_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null if anonymous usage
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('view', 'like', 'share', 'copy', 'download', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Pattern sharing and permissions
CREATE TABLE pattern_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null for public shares
    permission_level VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(pattern_id, shared_with_user_id)
);

-- Add soft delete support to patterns
ALTER TABLE patterns 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Enhanced pattern metadata
ALTER TABLE patterns 
ADD COLUMN complexity_score DECIMAL(3,2) CHECK (complexity_score >= 0 AND complexity_score <= 10),
ADD COLUMN estimated_time_minutes INTEGER CHECK (estimated_time_minutes > 0),
ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN parent_pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
ADD COLUMN search_vector tsvector;

-- Convert sequence from TEXT to JSONB for better performance
ALTER TABLE patterns ALTER COLUMN sequence TYPE JSONB USING sequence::JSONB;

-- Add optimized indexes for pattern search and performance
CREATE INDEX idx_patterns_search_vector ON patterns USING GIN(search_vector);
CREATE INDEX idx_patterns_deleted_at ON patterns(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_patterns_complexity ON patterns(complexity_score);
CREATE INDEX idx_patterns_version ON patterns(version);
CREATE INDEX idx_patterns_parent ON patterns(parent_pattern_id);

-- Enhanced GIN indexes for JSONB and array operations
CREATE INDEX idx_patterns_sequence_gin ON patterns USING GIN(sequence);
CREATE INDEX idx_patterns_tags_gin ON patterns USING GIN(tags);

-- Composite indexes for common query patterns
CREATE INDEX idx_patterns_user_public_created ON patterns(user_id, is_public, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_patterns_public_likes ON patterns(is_public, like_count DESC) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_patterns_difficulty_created ON patterns(difficulty_rating, created_at DESC) WHERE deleted_at IS NULL;

-- Collection indexes
CREATE INDEX idx_pattern_collections_user_id ON pattern_collections(user_id);
CREATE INDEX idx_pattern_collections_public ON pattern_collections(is_public) WHERE is_public = true;
CREATE INDEX idx_pattern_collection_items_collection ON pattern_collection_items(collection_id);
CREATE INDEX idx_pattern_collection_items_pattern ON pattern_collection_items(pattern_id);

-- Usage stats indexes
CREATE INDEX idx_pattern_usage_stats_pattern ON pattern_usage_stats(pattern_id);
CREATE INDEX idx_pattern_usage_stats_user ON pattern_usage_stats(user_id);
CREATE INDEX idx_pattern_usage_stats_action_created ON pattern_usage_stats(action_type, created_at DESC);

-- Pattern shares indexes  
CREATE INDEX idx_pattern_shares_pattern ON pattern_shares(pattern_id);
CREATE INDEX idx_pattern_shares_shared_by ON pattern_shares(shared_by_user_id);
CREATE INDEX idx_pattern_shares_shared_with ON pattern_shares(shared_with_user_id);

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_pattern_collections_updated_at 
    BEFORE UPDATE ON pattern_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update pattern search vector
CREATE OR REPLACE FUNCTION update_pattern_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.generation_prompt, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply search vector update trigger
CREATE TRIGGER patterns_search_vector_update
    BEFORE INSERT OR UPDATE ON patterns
    FOR EACH ROW EXECUTE FUNCTION update_pattern_search_vector();

-- Function to update pattern collection count
CREATE OR REPLACE FUNCTION update_collection_pattern_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pattern_collections 
        SET pattern_count = pattern_count + 1 
        WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE pattern_collections 
        SET pattern_count = pattern_count - 1 
        WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply collection count triggers
CREATE TRIGGER pattern_collection_items_count_trigger
    AFTER INSERT OR DELETE ON pattern_collection_items
    FOR EACH ROW EXECUTE FUNCTION update_collection_pattern_count();

-- Update existing patterns with search vectors
UPDATE patterns SET search_vector = 
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(generation_prompt, '')), 'C')
WHERE search_vector IS NULL;

-- Create materialized view for pattern analytics
CREATE MATERIALIZED VIEW pattern_analytics AS
SELECT 
    p.id,
    p.name,
    p.user_id,
    p.is_public,
    p.created_at,
    p.view_count,
    p.like_count,
    p.difficulty_rating,
    p.complexity_score,
    COUNT(DISTINCT pf.user_id) as unique_favorites,
    COUNT(DISTINCT pus.id) FILTER (WHERE pus.action_type = 'view') as detailed_view_count,
    COUNT(DISTINCT pus.id) FILTER (WHERE pus.action_type = 'share') as share_count,
    COUNT(DISTINCT pus.id) FILTER (WHERE pus.action_type = 'copy') as copy_count,
    COUNT(DISTINCT pci.collection_id) as collection_count,
    COALESCE(AVG(CASE WHEN pus.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as recent_activity_score
FROM patterns p
LEFT JOIN pattern_favorites pf ON p.id = pf.pattern_id
LEFT JOIN pattern_usage_stats pus ON p.id = pus.pattern_id
LEFT JOIN pattern_collection_items pci ON p.id = pci.pattern_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.user_id, p.is_public, p.created_at, p.view_count, p.like_count, p.difficulty_rating, p.complexity_score;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_pattern_analytics_id ON pattern_analytics(id);
CREATE INDEX idx_pattern_analytics_user_id ON pattern_analytics(user_id);
CREATE INDEX idx_pattern_analytics_public_recent ON pattern_analytics(is_public, recent_activity_score DESC) WHERE is_public = true;

-- Refresh function for analytics
CREATE OR REPLACE FUNCTION refresh_pattern_analytics() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pattern_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule analytics refresh (for systems with pg_cron extension)
-- SELECT cron.schedule('refresh-pattern-analytics', '*/15 * * * *', 'SELECT refresh_pattern_analytics();');