import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Drizzle client — only initialised when DATABASE_URL is present.
// The app uses the Supabase JS client for all runtime queries.
// DATABASE_URL is only needed for `npm run db:push` (Drizzle migrations).
const url = process.env.DATABASE_URL;
export const db = url
  ? drizzle(postgres(url, { prepare: false }), { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);
