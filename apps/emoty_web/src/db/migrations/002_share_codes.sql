-- Share codes table for pattern sharing functionality
-- This table stores short codes that allow sharing patterns via URLs

CREATE TABLE share_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_data JSONB NOT NULL, -- Compressed pattern data
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance
CREATE INDEX idx_share_codes_code ON share_codes(code);
CREATE INDEX idx_share_codes_pattern_id ON share_codes(pattern_id);
CREATE INDEX idx_share_codes_user_id ON share_codes(user_id);
CREATE INDEX idx_share_codes_expires_at ON share_codes(expires_at);

-- Add cleanup trigger for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_share_codes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM share_codes 
  WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run cleanup periodically
CREATE TRIGGER cleanup_expired_codes_trigger
  AFTER INSERT ON share_codes
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_share_codes();
