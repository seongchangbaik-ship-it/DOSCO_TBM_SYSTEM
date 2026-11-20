
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const safeUrl =
  url && url.startsWith("https://")
    ? url
    : "https://placeholder.supabase.co";

const safeAnon = anon || "placeholder-anon-key";

export const supabase = createClient(safeUrl, safeAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const configured = Boolean(
  url && anon && !url.includes("YOUR_PROJECT")
);

