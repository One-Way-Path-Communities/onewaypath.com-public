#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPgClient } from "../serverJS/database-config/pgClient.mjs";
import { getSchemaPrefix } from "../serverJS/database-config/schemaConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      const v = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
const localEnv = path.resolve(__dirname, ".env");
const serverEnv = path.resolve(__dirname, "../serverJS/.env");
const dbEnv = path.resolve(__dirname, "../serverJS/database-config/.env");
for (const p of [localEnv, serverEnv, dbEnv]) loadEnvFile(p);

const envPrefix = process.env.MENU_ENV_PREFIX || "WEBSITES";
const databaseOverride = process.env.MENU_DATABASE || "websites";

const schemaPrefixRaw = getSchemaPrefix({ envPrefix });
const schemaPrefix = schemaPrefixRaw ? `${schemaPrefixRaw.toLowerCase()}_` : "";

const statusTypeName = `${schemaPrefix}menu_item_status`;
const tableName = `${schemaPrefix}menu_items`;

// Source-of-truth menu tree. Adjust this array to change the menu structure.
const menuData = [
  { label: "About Us", url: "index.html#about", status: "active", displayOrder: 1 },
  {
    label: "Company",
    url: "#",
    status: "active",
    displayOrder: 2,
    children: [
      { label: "Designers", url: "designers.html", status: "active", displayOrder: 1 },
      { label: "Builders", url: "builders.html", status: "active", displayOrder: 2 },
      { label: "Experience", url: "experience.html", status: "active", displayOrder: 3 },
    ],
  },
  {
    label: "Projects",
    url: "#projects",
    status: "in-progress",
    displayOrder: 3,
    children: [
      { label: "Dewitt Road", url: "#projects-dewitt-road", status: "in-progress", displayOrder: 1 },
      { label: "Millen Road", url: "#projects-millen-road", status: "in-progress", displayOrder: 2 },
    ],
  },
  {
    label: "Community",
    url: "#",
    status: "active",
    displayOrder: 4,
    children: [
      { label: "Wellness", url: "wellness.html", status: "active", displayOrder: 1 },
      { label: "Homes", url: "community.html#homes", status: "active", displayOrder: 2 },
      { label: "Jobs", url: "community.html#jobs", status: "active", displayOrder: 3 },
      { label: "Environment", url: "community.html#environment", status: "active", displayOrder: 4 },
    ],
  },
  {
    label: "Contact",
    url: "#contact",
    status: "active",
    displayOrder: 5,
  },
];

async function upsertMenuItem(client, item, parentId = null) {
  // Find an existing row matching the same parent with either the label or URL to avoid unique conflicts.
  const existing = await client.query(
    `
      SELECT menu_item_id
      FROM ${tableName}
      WHERE parent_id IS NOT DISTINCT FROM $1
        AND label = $2
      ORDER BY menu_item_id
      LIMIT 1;
    `,
    [parentId, item.label]
  );

  let menuItemId;
  if (existing.rows.length) {
    const result = await client.query(
      `
        UPDATE ${tableName}
        SET label = $2,
            url = $3,
            status = $4,
            display_order = $5,
            is_external = $6
        WHERE menu_item_id = $1
        RETURNING menu_item_id;
      `,
      [
        existing.rows[0].menu_item_id,
        item.label,
        item.url,
        item.status || "inactive",
        item.displayOrder ?? 0,
        Boolean(item.isExternal),
      ]
    );
    menuItemId = result.rows[0].menu_item_id;
  } else {
    const result = await client.query(
      `
        INSERT INTO ${tableName} (parent_id, label, url, status, display_order, is_external)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING menu_item_id;
      `,
      [
        parentId,
        item.label,
        item.url,
        item.status || "inactive",
        item.displayOrder ?? 0,
        Boolean(item.isExternal),
      ]
    );
    menuItemId = result.rows[0].menu_item_id;
  }

  if (item.children?.length) {
    for (const child of item.children) {
      await upsertMenuItem(client, child, menuItemId);
    }
  }
}

async function dumpMenu(client) {
  const { rows } = await client.query(
    `
      WITH RECURSIVE menu_tree AS (
        SELECT
          menu_item_id,
          parent_id,
          label,
          url,
          status,
          display_order,
          is_external,
          0 AS depth,
          LPAD(CAST(display_order AS TEXT), 4, '0') || ':' || label AS sort_path
        FROM ${tableName}
        WHERE parent_id IS NULL
        UNION ALL
        SELECT
          mi.menu_item_id,
          mi.parent_id,
          mi.label,
          mi.url,
          mi.status,
          mi.display_order,
          mi.is_external,
          mt.depth + 1 AS depth,
          mt.sort_path || '/' || LPAD(CAST(mi.display_order AS TEXT), 4, '0') || ':' || mi.label AS sort_path
        FROM ${tableName} mi
        JOIN menu_tree mt ON mi.parent_id = mt.menu_item_id
      )
      SELECT
        repeat('  ', depth) || '- ' || label AS tree_label,
        url,
        status,
        display_order,
        is_external,
        menu_item_id,
        parent_id
      FROM menu_tree
      ORDER BY sort_path, menu_item_id;
    `
  );

  console.log("\nCurrent menu tree:");
  for (const row of rows) {
    console.log(
      `${row.tree_label} | url=${row.url} | status=${row.status} | order=${row.display_order} | id=${row.menu_item_id} parent=${row.parent_id ?? "null"}`
    );
  }
  console.log("");
}

async function main() {
  // Mirror base PG_* into prefixed keys if needed (same pattern as create-menu-schema.mjs).
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
    await client.query(`TRUNCATE ${tableName} RESTART IDENTITY CASCADE`); // start fresh each run
    for (const item of menuData) {
      await upsertMenuItem(client, item, null);
    }
    await client.query("COMMIT");
    console.log(
      `Menu items upserted into '${databaseOverride}' using prefix '${schemaPrefixRaw || "(none)"}'.`
    );
    await dumpMenu(client);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to seed menu items:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
