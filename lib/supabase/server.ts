// Server Component / Route Handler Supabase client. Uses the publishable
// (anon) key only, so every query it makes is still bound by RLS - fine for
// public reads like the jobs table. Once staff auth needs privileged
// server-side writes (Authorization branch), that should be a separate
// client using the service_role key, not an upgrade to this one.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component; ignore since middleware
            // handles session refresh when one exists.
          }
        },
      },
    }
  );
}
