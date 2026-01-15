#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getPgClient } from "../../serverJS/database-config/pgClient.mjs";
import { getSchemaPrefix } from "../../serverJS/database-config/schemaConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localEnvPath = path.resolve(__dirname, ".env");
const cwdEnvPath = path.resolve(process.cwd(), ".env");
const serverEnvPath = path.resolve(__dirname, "../../serverJS/.env");

// Load env vars, preferring a local .env in this folder, then a .env in the cwd, then serverJS/.env.
const envPath = [localEnvPath, cwdEnvPath, serverEnvPath].find((p) => fs.existsSync(p));
dotenv.config(envPath ? { path: envPath } : undefined);

const envPrefix = process.env.MENU_ENV_PREFIX || "WEBSITES";
const databaseOverride = process.env.MENU_DATABASE || "websites";

const schemaPrefixRaw = getSchemaPrefix({ envPrefix });
const schemaPrefix = schemaPrefixRaw ? `${schemaPrefixRaw.toLowerCase()}_` : "";

const sitesTable = `${schemaPrefix}sites`;
const updatedAtFunctionName = `${schemaPrefix}sites_set_updated_at`;
const updatedAtTriggerName = `${schemaPrefix}sites_updated_at_trigger`;

const seedSites = [
  { domain: "onewaypath.com", displayName: "onewaypath.com" },
  { domain: "buddhavipassana.ca", displayName: "buddhavipassana.ca" },
  { domain: "on-num.de", displayName: "on-num.de" },
];

const statements = [
  {
    name: "sites table",
    sql: `
      CREATE TABLE IF NOT EXISTS ${sitesTable} (
        site_id BIGSERIAL PRIMARY KEY,
        domain TEXT NOT NULL CHECK (trim(domain) <> ''),
        display_name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ${sitesTable}_domain_unique UNIQUE (domain)
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
          BEFORE UPDATE ON ${sitesTable}
          FOR EACH ROW
          EXECUTE FUNCTION ${updatedAtFunctionName}();
        END IF;
      END$$;
    `,
  },
];

async function main() {
  // Mirror base PG_* into prefixed keys if needed, so pgClient can resolve connection settings.
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

    for (const site of seedSites) {
      await client.query(
        `
          INSERT INTO ${sitesTable} (domain, display_name)
          VALUES ($1, $2)
          ON CONFLICT (domain)
          DO UPDATE SET display_name = EXCLUDED.display_name
          RETURNING site_id;
        `,
        [site.domain, site.displayName]
      );
    }

    await client.query("COMMIT");
    console.log(
      `Sites table ensured and seeded in database '${databaseOverride}' with prefix '${schemaPrefixRaw || "(none)"}'.`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to update sites table:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
