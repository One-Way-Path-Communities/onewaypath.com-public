#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getPgClient } from "../../serverJS/database-config/pgClient.mjs";
import { getSchemaPrefix } from "../../serverJS/database-config/schemaConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.resolve(__dirname, ".env");
const serverEnvPath = path.resolve(__dirname, "../../serverJS/.env");

// Load env vars, preferring a local .env in this folder, then falling back to serverJS/.env.
const envPath = [localEnvPath, serverEnvPath].find((p) => fs.existsSync(p));
dotenv.config(envPath ? { path: envPath } : undefined);

const envPrefix = process.env.MENU_ENV_PREFIX || "DATABASE";
const databaseOverride = process.env.MENU_DATABASE || "website";

const schemaPrefixRaw = getSchemaPrefix({ envPrefix });
const schemaPrefix = schemaPrefixRaw ? `${schemaPrefixRaw.toLowerCase()}_` : "";

const statusTypeName = `${schemaPrefix}menu_item_status`;
const tableName = `${schemaPrefix}menu_items`;
const updatedAtFunctionName = `${schemaPrefix}menu_items_set_updated_at`;
const updatedAtTriggerName = `${schemaPrefix}menu_items_updated_at_trigger`;

const statements = [
  {
    name: "menu status enum",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${statusTypeName}') THEN
          CREATE TYPE ${statusTypeName} AS ENUM ('active', 'inactive', 'in-progress');
        END IF;
      END$$;
    `,
  },
  {
    name: "ensure in-progress enum value",
    sql: `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${statusTypeName}') THEN
          BEGIN
            ALTER TYPE ${statusTypeName} ADD VALUE IF NOT EXISTS 'in-progress';
          EXCEPTION WHEN duplicate_object THEN
            NULL;
          END;
        END IF;
      END$$;
    `,
  },
  {
    name: "menu items table",
    sql: `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        menu_item_id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES ${tableName}(menu_item_id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        url TEXT NOT NULL CHECK (trim(url) <> ''),
        status ${statusTypeName} NOT NULL DEFAULT 'inactive',
        display_order INTEGER NOT NULL DEFAULT 0,
        is_external BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ${tableName}_parent_label UNIQUE (parent_id, label),
        CONSTRAINT ${tableName}_parent_url UNIQUE (parent_id, url)
      );
    `,
  },
  {
    name: "updated_at trigger function",
    sql: `
      CREATE OR REPLACE FUNCTION ${updatedAtFunctionName}() RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `,
  },
  {
    name: "updated_at trigger",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${updatedAtTriggerName}') THEN
          CREATE TRIGGER ${updatedAtTriggerName}
          BEFORE UPDATE ON ${tableName}
          FOR EACH ROW
          EXECUTE FUNCTION ${updatedAtFunctionName}();
        END IF;
      END$$;
    `,
  },
  {
    name: "ordering index",
    sql: `
      CREATE INDEX IF NOT EXISTS ${tableName}_display_order_idx
      ON ${tableName} (COALESCE(parent_id, 0), display_order, menu_item_id);
    `,
  },
];

async function main() {
  // If the chosen env prefix isn't set but base PG_* vars exist (from serverJS/.env),
  // mirror them into the prefixed variables so pgClient can read them.
  const copyIfMissing = (suffix, fallbackKey) => {
    const targetKey = `${envPrefix}_${suffix}`;
    if (!process.env[targetKey] && process.env[fallbackKey]) {
      process.env[targetKey] = process.env[fallbackKey];
    }
  };
  copyIfMissing("PG_HOST", "PG_HOST");
  copyIfMissing("PG_PORT", "PG_PORT");
  copyIfMissing("PG_USER", "PG_USER");
  copyIfMissing("PG_PASSWORD", "PG_PASSWORD");
  copyIfMissing("PG_DATABASE", "PG_DATABASE");

  const client = await getPgClient({ envPrefix, databaseOverride });
  try {
    await client.query("BEGIN");
    for (const step of statements) {
      console.log(`Running: ${step.name}`);
      await client.query(step.sql);
    }
    await client.query("COMMIT");
    console.log(
      `Menu schema ensured in database '${databaseOverride}' with prefix '${schemaPrefixRaw}'.`
    );
    await client.end();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
    console.error("Failed to create menu schema:", err.message);
    process.exit(1);
  }
}

main();
