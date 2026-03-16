import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Drop-in replacement for window.storage used in the original Claude artifact.
 * Backed by a single Supabase table: los_data (key TEXT PK, value TEXT)
 *
 * Required SQL (run once in Supabase SQL editor):
 *
 *   CREATE TABLE los_data (
 *     key   TEXT PRIMARY KEY,
 *     value TEXT NOT NULL,
 *     updated_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 *   -- Optional: enable RLS and allow all for now (personal tool)
 *   ALTER TABLE los_data ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Allow all" ON los_data FOR ALL USING (true) WITH CHECK (true);
 */
export const storage = {
  async get(key) {
    const { data, error } = await supabase
      .from("los_data")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data ? { value: data.value } : null;
  },

  async set(key, value) {
    const { error } = await supabase
      .from("los_data")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
  },
};
