// Enhanced Database types for Emoty Web Application - Phase 2
import type { Generated, ColumnType, Insertable, Updateable, Selectable } from 'kysely';

export interface Database {
  users: UserTable;
  patterns: PatternTable;
  achievements: AchievementTable;
  user_achievements: UserAchievementTable;
  pattern_favorites: PatternFavoriteTable;
  user_sessions: UserSessionTable;
  pattern_collections: PatternCollectionTable;
  pattern_collection_items: PatternCollectionItemTable;
  pattern_usage_stats: PatternUsageStatsTable;
  pattern_shares: PatternShareTable;
  share_codes: ShareCodeTable;
  pattern_analytics: PatternAnalyticsTable;
}

export interface ShareCodeTable {
  id: Generated<string>;
  code: string;
  pattern_id: string;
  user_id: string;
  pattern_data: string;
  view_count: Generated<number>;
  expires_at: Date | null;
  created_at: Generated<Date>;
}

export interface UserTable {
  id: Generated<string>;
  email: string;
  password_hash: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_level: UserLevel;
  reputation_score: number;
  total_patterns_created: number;
  favorite_palettes: string[] | null;
  accessibility_preferences: AccessibilityPreferences | null;
  language_preference: 'en' | 'fr';
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  last_login_at: Date | null;
  is_active: Generated<boolean>;
}

export interface PatternTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  sequence: PatternSequence; // JSONB array of emoji objects
  palette_id: string;
  size: number;
  is_public: Generated<boolean>;
  is_ai_generated: Generated<boolean>;
  generation_prompt: string | null;
  tags: string[] | null;
  difficulty_rating: number | null;
  view_count: Generated<number>;
  like_count: Generated<number>;
  complexity_score: number | null;
  estimated_time_minutes: number | null;
  version: Generated<number>;
  parent_pattern_id: string | null;
  search_vector: string | null; // tsvector
  deleted_at: Date | null;
  deleted_by: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PatternCollectionTable {
  id: Generated<string>;
  user_id: string;
  name: string;
  description: string | null;
  color: Generated<string>;
  is_public: Generated<boolean>;
  pattern_count: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PatternCollectionItemTable {
  id: Generated<string>;
  collection_id: string;
  pattern_id: string;
  added_at: Generated<Date>;
}

export interface PatternUsageStatsTable {
  id: Generated<string>;
  pattern_id: string;
  user_id: string | null;
  action_type: PatternActionType;
  created_at: Generated<Date>;
}

export interface PatternShareTable {
  id: Generated<string>;
  pattern_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string | null;
  permission_level: PatternPermissionLevel;
  expires_at: Date | null;
  created_at: Generated<Date>;
}

export interface PatternAnalyticsTable {
  id: string;
  name: string;
  user_id: string;
  is_public: boolean;
  created_at: Date;
  view_count: number;
  like_count: number;
  difficulty_rating: number | null;
  complexity_score: number | null;
  unique_favorites: number;
  detailed_view_count: number;
  share_count: number;
  copy_count: number;
  collection_count: number;
  recent_activity_score: number;
}

export interface AchievementTable {
  id: Generated<string>;
  achievement_key: string;
  name_en: string;
  name_fr: string;
  description_en: string;
  description_fr: string;
  icon: string;
  required_level: UserLevel;
  category: AchievementCategory;
  points_value: number;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
}

export interface UserAchievementTable {
  id: Generated<string>;
  user_id: string;
  achievement_id: string;
  unlocked_at: Generated<Date>;
  progress_value: number | null;
}

export interface PatternFavoriteTable {
  id: Generated<string>;
  user_id: string;
  pattern_id: string;
  created_at: Generated<Date>;
}

export interface UserSessionTable {
  id: Generated<string>;
  user_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Generated<Date>;
}

// Enums and supporting types
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type PatternMode = 'concentric' | 'sequential';

export type AchievementCategory =
  | 'pattern_creation'
  | 'social_engagement'
  | 'exploration'
  | 'ai_interaction'
  | 'accessibility'
  | 'special';

export type PatternActionType = 'view' | 'like' | 'share' | 'copy' | 'download' | 'edit';

export type PatternPermissionLevel = 'view' | 'edit' | 'admin';

export interface AccessibilityPreferences {
  high_contrast: boolean;
  large_text: boolean;
  reduced_motion: boolean;
  screen_reader_mode: boolean;
  voice_commands_enabled: boolean;
  preferred_input_method: 'touch' | 'voice' | 'keyboard' | 'gesture';
  color_blind_assistance: boolean;
}

// Pattern sequence structure for JSONB storage
export interface PatternSequence {
  emojis: EmojiCell[];
  metadata: {
    version: number;
    created_with: string;
    last_modified: Date;
  };
}

export interface EmojiCell {
  emoji: string;
  position: {
    row: number;
    col: number;
  };
  metadata?: {
    added_at?: Date;
    source?: 'user' | 'ai' | 'preset';
  };
}

// Search and filtering types
export interface PatternSearchFilters {
  query?: string;
  tags?: string[];
  difficulty_min?: number;
  difficulty_max?: number;
  complexity_min?: number;
  complexity_max?: number;
  user_level?: UserLevel;
  is_ai_generated?: boolean;
  is_public?: boolean;
  created_after?: Date;
  created_before?: Date;
  user_id?: string;
  palette_id?: string;
}

export interface PatternSortOptions {
  field: 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'name' | 'difficulty_rating' | 'complexity_score';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit: number;
  cursor?: string; // for cursor-based pagination
  offset?: number; // for offset-based pagination
}

// Enhanced helper types for queries
export type UserWithStats = UserTable & {
  achievement_count: number;
  pattern_count: number;
  favorite_count: number;
  collection_count: number;
};

export type PatternWithDetails = Selectable<PatternTable> & {
  user_username: string;
  user_full_name: string | null;
  user_avatar_url: string | null;
  is_favorited: boolean;
  collection_names: string[];
  analytics: PatternAnalyticsTable | null;
};

export type PatternCollectionWithDetails = Selectable<PatternCollectionTable> & {
  patterns: Selectable<PatternTable>[];
  preview_patterns: Selectable<PatternTable>[]; // First 3-4 patterns for preview
  user_username: string;
};

// Database utility types
export type UserInsert = Omit<Insertable<UserTable>, 'id' | 'created_at' | 'updated_at'>;
export type UserUpdate = Updateable<UserTable>;

export type PatternInsert = Omit<Insertable<PatternTable>, 'id' | 'created_at' | 'updated_at' | 'search_vector' | 'view_count' | 'like_count' | 'version' | 'deleted_at' | 'deleted_by'>;
export type PatternUpdate = Updateable<PatternTable>;

export type PatternCollectionInsert = Omit<Insertable<PatternCollectionTable>, 'id' | 'created_at' | 'updated_at' | 'pattern_count'>;
export type PatternCollectionUpdate = Updateable<PatternCollectionTable>;

export type PatternUsageStatsInsert = Omit<Insertable<PatternUsageStatsTable>, 'id' | 'created_at'>;
export type PatternShareInsert = Omit<Insertable<PatternShareTable>, 'id' | 'created_at'>;
export type ShareCodeInsert = Omit<Insertable<ShareCodeTable>, 'id' | 'created_at' | 'view_count'>;

// Cache types for IndexedDB
export type CachedPattern = Selectable<PatternTable> & {
  cached_at: Date;
  needs_sync: boolean;
  offline_changes?: Partial<PatternUpdate>;
};

export interface CacheMetadata {
  version: string;
  last_sync: Date;
  pattern_count: number;
  user_id: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
    cursor?: string;
  };
}

export interface PatternSearchResponse extends PaginatedResponse<PatternWithDetails> {
  facets: {
    tags: { tag: string; count: number }[];
    difficulty_ratings: { rating: number; count: number }[];
    palettes: { palette_id: string; count: number }[];
    user_levels: { level: UserLevel; count: number }[];
  };
}

export interface PatternAnalytics {
  total_patterns: number;
  public_patterns: number;
  private_patterns: number;
  ai_generated_patterns: number;
  total_views: number;
  total_likes: number;
  total_favorites: number;
  average_complexity: number;
  most_popular_tags: { tag: string; count: number }[];
  creation_trends: { date: string; count: number }[];
}