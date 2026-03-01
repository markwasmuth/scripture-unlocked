// ═══════════════════════════════════════════════════════════════
// SCRIPTURE UNLOCKED — Supabase Client
// ═══════════════════════════════════════════════════════════════
// Single instance of the Supabase client for the entire app.
// Uses public anon key — safe for client-side usage with RLS.
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
