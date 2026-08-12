// Supabase client that forwards the signed-in user's Clerk session token as
// the request's accessToken, so Postgres RLS can see who's asking (the
// role: authenticated and user_role claims Clerk's Supabase integration
// adds to the session token). Distinct from server.ts (cookie-based, no
// Clerk identity, anonymous public reads) and public.ts (no cookies at all,
// build-time static generation) - this is the one client that actually
// carries a staff identity, use it only where that's needed.
import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export function createClerkSupabaseClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
    }
  );
}
