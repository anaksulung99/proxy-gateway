-- Runs once on first init, inside the POSTGRES_DB database.
-- Extensions are optional (the app uses integer ids + plain columns) but handy.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- trigram indexes for host/target search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- gin index support
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive text

SET timezone = 'UTC';
