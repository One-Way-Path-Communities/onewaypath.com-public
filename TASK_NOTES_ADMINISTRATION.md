# Task Notes: Administration (Team) Page

## Consent to be listed on the site

- **Confirmation:** Only team members who have consented to be listed are shown on the public site.
- **Implementation:** Consent is represented by the **live** field in the Suppliers Airtable **Team** table. The backend maps Airtable `live` / `Live` to the database; in production, GET `/api/websites/individuals` and GET `/api/websites/administration` return only rows where `live = true`.
- **Action for content owners:** In Airtable, set the "Live" (or "live") checkbox to true only for Team records where the person has consented to be listed. Designers and Administration pages both respect this field.

## Single individuals API and table

- One **Team** table in Airtable and one **individuals** table in the DB. Category is used to filter who appears on the Designers vs Administration page.
- **Category field:** Supports **multi-select** in Airtable. Stored in the DB as a comma-separated string (e.g. `"Designers, Administration"`).
- **Sync:** POST `/api/websites/individuals/sync` fetches all Team records where category includes **Designers** or **Administration** and replaces the individuals table.
- **Designers page:** GET `/api/websites/individuals` (default) or `?category=Designers` — returns only rows whose category includes Designers.
- **Administration page:** GET `/api/websites/administration` or GET `/api/websites/individuals?category=Administration` — returns only rows whose category includes Administration.

## Airtable setup (category multi-select, Alex & Miriam)

1. **Category field:** In the Suppliers base **Team** table, set the **Category** field to allow **multiple selections** (multi-select). Ensure the field has options: **Designers**, **Administration** (and any others you use).
2. **Add Administration to Alex and Miriam:** For team members Alex and Miriam, add **Administration** to their Category (in addition to any existing value, e.g. so they can appear on both Designers and Administration if needed).
3. **Consent:** For each person listed on the site, confirm consent and set **Live** to true only for those who have agreed to be listed.

## Data mapping

| Source (Airtable Team)     | Sync (single)                    | DB table      | API / filter                          |
|----------------------------|-----------------------------------|---------------|----------------------------------------|
| category includes Designers or Administration | One sync; filter: OR(FIND("Designers", {category})>0, FIND("Administration", {category})>0) | `individuals` | GET `/api/websites/individuals` → category includes Designers |
| Same table                 | Same sync                         | Same          | GET `/api/websites/administration` → category includes Administration |

Sync endpoint: POST `/api/websites/individuals/sync` (no separate administration sync).

## Team headshots (`photo` / `photo_new`) and layout

- **While testing new assets:** Add attachments to Airtable field **`photo_new`**. The sync (`mapAirtableIndividualToRow` in `serverJS`) prefers **`photo_new`**, then falls back to **`photo`**, so the live site can keep syncing old **`photo`** until you are ready.
- **Public UI:** Designers and Administration pages use a **fixed width** and **natural height** (no square crop) so non-square photos display fully.
- **After QA in Airtable:** Rename **`photo`** → **`photo_old`** (archive) and **`photo_new`** → **`photo`**. The server continues to resolve the headshot from **`photo`**; no code change is required for that rename. Optional later cleanup: simplify the server helper to only read `photo` if you want to drop `photo_new` from the codebase.

### Verify locally

1. Run individuals sync: `POST /api/websites/individuals/sync`
2. Open `designers.html` and `administration.html` against your API base; confirm images and aspect ratios.
