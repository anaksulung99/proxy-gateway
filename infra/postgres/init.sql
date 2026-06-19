-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Trigram index untuk full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- GIN index support
CREATE EXTENSION IF NOT EXISTS "citext";

-- Case-insensitive text
-- Set timezone
SET
  timezone = 'UTC';

-- Default search path
ALTER DATABASE proxydb
SET
  search_path TO public;

-- Performance settings (akan di-override oleh postgresql.conf jika perlu)
-- Cukup untuk development, sesuaikan untuk production
COMMENT ON DATABASE proxydb IS 'Proxy System — main database';