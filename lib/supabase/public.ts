// Plain (non-SSR) Supabase client for public, read-only queries with no
// session/cookie dependency, e.g. generateStaticParams and other build-time
// or static-generation contexts, where next/headers' cookies() throws
// because there's no request to read cookies from. Uses the publishable
// key only, still bound by RLS.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
