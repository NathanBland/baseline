-- Initialize baseline database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create baseline database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable, but keeping for reference)

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE baseline TO postgres;
