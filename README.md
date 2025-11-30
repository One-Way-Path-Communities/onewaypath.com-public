# One Way Path — Static Site

This repo is a single static HTML page served via nginx. It uses no build tools or bundlers.

## Stack
- Tailwind CSS via CDN, with in-page `tailwind.config` defining the gold/red/olive/slate palette and Roboto font.
- Flowbite via CDN for dropdowns/collapse behavior.
- No local CSS (the old `style.css` is unused); no JS beyond Flowbite and the Tailwind config.

## Repeatable Patterns
- **Nav links and dropdowns:** Uppercase links on desktop; dropdowns for `PROJECTS` and `COMMUNITY` reuse Flowbite’s `data-dropdown-toggle` plus the shared arrow icon and border/shadow classes (`projectsDropdown`, `benefitsDropdown`).
- **Desktop Contact slide:** Triggered by the `CONTACT` link via `data-collapse-toggle="nav-panel"`; the panel holds About/Contact info.
- **Mobile menu:** `mobile-menu` collapse contains stacked links for Projects, Designers, Builders, Experience, Community, and Contact.
- **Hero band:** Red background with overlay graphic, heading + body copy.
- **Section rows (Vision, Mission):** Two-column layout: left heading in gold uppercase; right body text with relaxed line-height.
- **Values grid:** Fixed-width left labels, right descriptions, vertical divider, and consistent spacing.
- **Footer bar:** Solid red background with gold/white copyright line.
- **Mobile contact block:** Off-white contact info section (only visible on small screens).

## How It’s Built
- Everything lives in `index.html` and loads from CDNs. No build step: edit the file, commit, and deploy.
- Tailwind is configured in the page head; custom colors are defined there.
- Flowbite handles dropdowns and collapse toggles through `data-` attributes; no custom JS required.

## Deploy
1) Push `index.html` (and assets) to the repo and pull on the server.  
2) Ensure nginx points to this folder and uses `index index.html;`.  
3) Reload nginx.  
4) Replace placeholder links/URLs as needed (Projects, Community, Experience) and wire real targets.
