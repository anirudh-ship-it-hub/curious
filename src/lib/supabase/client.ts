import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key, subject to RLS. Used in client components (the login form, the
// main page). Never import this in server-only code; use server.ts or admin.ts there instead.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
