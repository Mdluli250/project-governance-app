-- Migration: Add password_hash column to profiles table
-- Run this on existing databases that were created before the column was added to create-schema.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
