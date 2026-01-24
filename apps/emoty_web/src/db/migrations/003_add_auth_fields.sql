-- Add authentication fields to users table
-- Migration: 003_add_auth_fields.sql

ALTER TABLE users ADD COLUMN password_hash TEXT;
