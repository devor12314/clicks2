import { getConnectionString } from "@netlify/database";
import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;
let profileSchemaReady: Promise<unknown> | undefined;
export function getDb() {
  if (client) return client;
  const connection =
    process.env.NETLIFY_DB_URL ||
    process.env.DATABASE_URL ||
    getConnectionString();
  if (!connection)
    throw new Error(
      "Netlify Database is not connected. Run `netlify database init` or set NETLIFY_DB_URL.",
    );
  client = postgres(connection, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return client;
}

export async function ensureProfileSchema() {
  if (!profileSchemaReady) {
    const db = getDb();
    profileSchemaReady =
      db`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data_url TEXT`.catch(
        (error) => {
          profileSchemaReady = undefined;
          throw error;
        },
      );
  }
  await profileSchemaReady;
}
