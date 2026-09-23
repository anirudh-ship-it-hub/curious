import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server client — anon key, subject to RLS, but reads the session from cookies so
// `auth.uid()` resolves correctly in Server Components and Route Handlers. `cookies()` is
// async in this Next.js version.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render — middleware handles session refresh
          // there instead. Safe to ignore (Supabase SSR's own documented caveat).
        }
      },
    },
  });
}
