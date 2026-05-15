import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

import * as schema from "./schema";

export type PippaDatabase = ReturnType<typeof createDatabase>;

let cachedDb: PippaDatabase | undefined;

export function createDatabase() {
  const url = process.env.DATABASE_URL;
  const host = process.env.DATABASE_HOST;
  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;

  if (!url && (!host || !username || !password)) {
    throw new Error("DATABASE_URL or DATABASE_HOST, DATABASE_USERNAME, and DATABASE_PASSWORD are required.");
  }

  const client = url ? new Client({ url }) : new Client({ host, username, password });

  return drizzle({ client, schema });
}

export function getDatabase() {
  cachedDb ??= createDatabase();
  return cachedDb;
}
