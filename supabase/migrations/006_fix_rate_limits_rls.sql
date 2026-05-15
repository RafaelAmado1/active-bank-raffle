-- Migration 002 created a permissive RLS policy on api_rate_limits with `using (true)`.
-- Migration 003 dropped policies on the other tables but missed this one.
-- The anon key (NEXT_PUBLIC_, visible in the browser) could read/write rate limit
-- counters directly via the Supabase REST API, bypassing all rate limiting.
-- This migration drops that policy so only the service role key (server-side) can access the table.
drop policy if exists "service_role_all_rate_limits" on api_rate_limits;
