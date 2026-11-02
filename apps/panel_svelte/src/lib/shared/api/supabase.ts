import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'http://127.0.0.1:54331',
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ??
    'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
);
