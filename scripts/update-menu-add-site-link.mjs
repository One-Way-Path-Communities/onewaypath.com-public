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
const menuTable = `${schemaPrefix}menu_items`;

const addColumnAndDropOldConstraints = `
  ALTER TABLE ${menuTable}
    ADD COLUMN IF NOT EXISTS site_id BIGINT;

  ALTER TABLE ${menuTable} DROP CONSTRAINT IF EXISTS ${menuTable}_parent_label;
  ALTER TABLE ${menuTable} DROP CONSTRAINT IF EXISTS ${menuTable}_parent_url;
  DROP INDEX IF EXISTS ${menuTable}_display_order_idx;
`;

const addConstraintsAndIndex = `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = '${menuTable}_site_id_fkey'
        AND table_name = '${menuTable}'
    ) THEN
      ALTER TABLE ${menuTable}
        ADD CONSTRAINT ${menuTable}_site_id_fkey
        FOREIGN KEY (site_id) REFERENCES ${sitesTable}(site_id)
        ON DELETE RESTRICT;
    END IF;
  END$$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = '${menuTable}_site_parent_label'
        AND table_name = '${menuTable}'
    ) THEN
      ALTER TABLE ${menuTable}
        ADD CONSTRAINT ${menuTable}_site_parent_label UNIQUE (site_id, parent_id, label);
    END IF;
  END$$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = '${menuTable}_site_parent_url'
        AND table_name = '${menuTable}'
    ) THEN
      ALTER TABLE ${menuTable}
        ADD CONSTRAINT ${menuTable}_site_parent_url UNIQUE (site_id, parent_id, url);
    END IF;
  END$$;

  CREATE INDEX IF NOT EXISTS ${menuTable}_site_order_idx
    ON ${menuTable} (site_id, COALESCE(parent_id, 0), display_order, menu_item_id);

  ALTER TABLE ${menuTable}
    ALTER COLUMN site_id SET NOT NULL;
`;

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

    console.log("Ensuring site_id column and dropping old constraints/indexes...");
    await client.query(addColumnAndDropOldConstraints);

    console.log("Fetching site_id for domain 'onewaypath.com'...");
    const siteResult = await client.query(
      `SELECT site_id FROM ${sitesTable} WHERE domain = $1 LIMIT 1;`,
      ["onewaypath.com"]
    );
    if (!siteResult.rows.length) {
      throw new Error(
        `Domain 'onewaypath.com' not found in ${sitesTable}. Seed the sites table first.`
      );
    }
    const siteId = siteResult.rows[0].site_id;

    console.log("Backfilling existing menu items to onewaypath.com...");
    await client.query(
      `UPDATE ${menuTable} SET site_id = $1 WHERE site_id IS NULL;`,
      [siteId]
    );

    console.log("Adding foreign key, unique constraints, index, and NOT NULL...");
    await client.query(addConstraintsAndIndex);

    await client.query("COMMIT");
    console.log(
      `menu_items updated: site_id added, existing rows linked to onewaypath.com (site_id=${siteId}), constraints updated.`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to update menu_items with site linkage:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
