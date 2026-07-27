import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur (composants "use client").
 * Utilise la clé anon publique — la sécurité est assurée par les RLS Postgres.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
