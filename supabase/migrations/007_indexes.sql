-- The GET /api/raffles query uses ORDER BY created_at DESC without a covering index.
-- This migration adds the missing index to avoid a full table scan on every poll.
create index if not exists idx_raffles_created_at on raffles (created_at desc);
