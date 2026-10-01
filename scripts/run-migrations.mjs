#!/usr/bin/env node
/**
 * Run Supabase SQL migrations against DATABASE_URL from .env.local
 * Usage: npm run db:migrate
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function getDatabaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;
  return null;
}

async function main() {
  const env = { ...process.env, ...loadEnvLocal() };
  const databaseUrl = getDatabaseUrl(env);

  if (!databaseUrl) {
    console.error("\nMissing DATABASE_URL in .env.local\n");
    console.error("Get it from Supabase → Project Settings → Database → Connection string → URI");
    console.error("Replace [YOUR-PASSWORD] with your database password.\n");
    console.error("Example .env.local line:");
    console.error("DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres\n");
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (!files.length) {
    console.error("No migration files found in supabase/migrations/");
    process.exit(1);
  }

  console.log(`Connecting to database…`);
  const sql = postgres(databaseUrl, { max: 1, ssl: "require" });

  try {
    for (const file of files) {
      const path = join(migrationsDir, file);
      const query = readFileSync(path, "utf8");
      console.log(`\n▶ Running ${file}…`);
      await sql.unsafe(query);
      console.log(`✓ ${file} complete`);
    }
    console.log("\n✅ All migrations applied successfully.\n");
  } catch (err) {
    console.error("\n❌ Migration failed:\n", err.message || err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
