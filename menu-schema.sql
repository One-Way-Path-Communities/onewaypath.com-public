-- Menu schema generated from create-menu-schema.mjs (no schema prefix configured).
-- Adjust names if you set a SCHEMA_PREFIX via MENU_ENV_PREFIX-related env vars.
-- Plain language overview:
-- - One table: menu_items. No second table for submenus.
-- - A row can point to its parent row via parent_id, making a tree (nested menus).
-- - parent_id is NULL for top-level items; set to a menu_item_id to create a submenu item.
-- - Unique constraints stop duplicate labels or URLs under the same parent.
-- - status uses an enum (active, inactive, in-progress).
-- - display_order controls ordering among siblings; index helps ordering queries.
-- - Trigger keeps updated_at fresh on updates.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'menu_item_status') THEN
    CREATE TYPE menu_item_status AS ENUM ('active', 'inactive', 'in-progress');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS menu_items (
  menu_item_id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT REFERENCES menu_items(menu_item_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL CHECK (trim(url) <> ''),
  status menu_item_status NOT NULL DEFAULT 'inactive',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_external BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_items_parent_label UNIQUE (parent_id, label),
  CONSTRAINT menu_items_parent_url UNIQUE (parent_id, url)
);

CREATE OR REPLACE FUNCTION menu_items_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'menu_items_updated_at_trigger') THEN
    CREATE TRIGGER menu_items_updated_at_trigger
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION menu_items_set_updated_at();
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS menu_items_display_order_idx
  ON menu_items (COALESCE(parent_id, 0), display_order, menu_item_id);
