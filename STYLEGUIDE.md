# One Way Path — Design Tokens & Patterns (CDN Setup)

Use this as the single source for typography, colors, and repeatable components. Tailwind is loaded via CDN; tokens are defined in `index.html` inside `tailwind.config`.

## Typography
- Font family: `Roboto`, fallback `ui-sans-serif, system-ui, sans-serif`.
- Weights in use: 400 (body), 500 (labels/links), 700 (section headings).
- Headings (desktop): `text-xl`/`text-2xl` uppercase with slight tracking (≈0.08em–0.12em).
- Body: `text-lg` with relaxed line-height (~1.5–1.75); labels (values) `text-base` uppercase.

## Colors (Tailwind keys)
- Gold: `gold.50–900` primary accent (example body gold-50, headings gold-600/400).
- Red: `red.500` hero/footer background.
- Olive: `olive.500` nav and subhead links; hover `olive.800`.
- Slate: `slate.700/800` body text; `slate.200` dividers; `#f2ede1` page background.

## Icons
- Use Feather Icons (thin-stroke SVG set): https://feathericons.com. Prefer inline SVG or `data-feather` with the CDN (`https://unpkg.com/feather-icons`) so icons inherit `currentColor`.

## Components (reuse)
- **Nav links (desktop):** Uppercase, `text-base font-medium text-olive-500`, hover `text-olive-800`. Projects uses Flowbite dropdown; other links (Designers, Builders, Wellness, Community, Contact trigger) are single links. Panels are `bg-white border-slate-200 shadow divide-slate-100`.
- **Mobile menu:** `mobile-menu` collapse contains stacked uppercase links; keep padding `px-8` to align with content. Trigger button on mobile/375: icon-only hamburger, h-6 w-6, bordered, padding `px-3 py-1.5`, right-aligned next to the logo (`ml-auto`), no “Menu” label.
- **Contact slide (desktop):** `nav-panel` collapse (About + Contact info). Trigger via `data-collapse-toggle="nav-panel"` on the Contact link/button. Include the `nav-panel` block on every page using this nav; inline contact sections should be `lg:hidden` so they only show on mobile.
- **Hero band:** Red background, overlaid SVG, heading (`text-2xl/3xl uppercase, tracking 0.12em`), body (`text-xl leading-[1.75]`).
- **Section rows (Vision/Mission):** Grid `lg:grid-cols-[220px_1fr]`, left heading gold uppercase, right body `text-lg leading-[1.5]`.
- **Values grid:** Grid `grid-cols-[170px_1fr]`, vertical divider (`bg-slate-200`), label `text-base uppercase`, description `text-lg` with responsive left padding (`pl-0 sm:pl-4`).
- **Stat rows (Wellness):** Use `fitwel-stat-number` (42px, condensed, uppercase text, letter-spacing 2px, black, line-height 1.05) for headline numbers; body beneath uses `fitwel-body`. Keep stats in a 3-column grid on small screens and above.
- **Builder highlights:** For stat callouts (pipeline visibility, hours saved, liquidity) use `fitwel-stat-number` with subheading `fitwel-heading-sm text-olive-500` and grids to match wellness highlights.
- **Profile rows (e.g., Designers):** Grid `lg:grid-cols-[340px_1fr]`, `gap-8` with `pb-16`; name uses `fitwel-heading` gold; title sits on the next line using `fitwel-heading-sm text-olive-500`; body copy uses `fitwel-body` with added left padding (`lg:pl-8`) on large screens for alignment.
- **Link row (desktop):** Projects dropdown, Designers, Builders, Experience, Community dropdown, Contact trigger; uppercase `text-base font-medium text-olive-500` with gap spacing.
- **Footer:** Red background (`bg-red-500`), gold copyright text `© 2025` with white body text.
- **Mobile contact block:** Off-white background (`#f2ede1`), padded `px-8 py-10`, `lg:hidden` to avoid showing on desktop.
- **Page layout:** Use `body` with `min-h-screen flex flex-col` and `main` with `flex-1` so the footer sits flush to the bottom with no extra space underneath.

## Spacing
1) Hero to content: hero uses `py-14 lg:py-16`. The very next section starts with `py-20`, so the separation from the hero to the first content row is that 5rem top padding on large screens (4rem on smaller screens); no extra margin between them.
2) Other content sections: default vertical padding `py-14` unless a specific design calls for more.
3) Horizontal padding on key sections/nav/footer: `px-8`.
4) Two-column rows (headings + body): `lg:grid-cols-[200px_1fr]` with column `gap-3` (0.75rem) and text column `lg:pl-4` (1rem) = ~1.75rem total separation; left column fixed at 200px, right column fills remaining width. Values row gaps: `gap-9` with `sm:gap-x-6`.

## Usage Notes
- Keep tokens in `tailwind.config` inside `index.html`; update this guide when changing colors/typography.
- Prefer Tailwind utility classes; Flowbite handles dropdown/collapse via `data-` attributes—no custom JS needed.
- The legacy `style.css` is unused; keep styles inline via Tailwind utilities.***
