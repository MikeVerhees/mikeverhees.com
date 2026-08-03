# Copilot Instructions

## Project Overview

Personal website for Mike Verhees, built with [Next.js](https://nextjs.org/) (App Router) and Tailwind CSS. Statically exported (`output: "export"`) and deployed to GitHub Pages under the custom domain `mikeverhees.com`.

## Commands

```bash
npm run dev      # Dev server with live reload
npm run build    # Production build → out/ (static export)
npm run preview  # Serve the exported out/ directory locally
npm run lint     # ESLint
```

No test suite exists.

## Architecture

```
app/
  layout.tsx     # Root layout: <html>/<head>/<body>, header, footer, site-wide Metadata export
  page.tsx        # "/" — renders About + JsonLd
  not-found.tsx    # 404 page (out/404.html)
  globals.css       # Tailwind import + design tokens (@theme block, CSS vars for dark mode)
  sitemap.ts         # Generates sitemap.xml at build time
  favicon.ico
components/
  About.tsx        # About Me content
  Footer.tsx         # Contact icon links, sourced from lib/site.ts
  JsonLd.tsx           # Person + WebSite JSON-LD structured data
lib/
  site.ts              # Single source of truth: title, url, description, author, contactLinks
public/
  CNAME                 # GitHub Pages custom domain
  robots.txt              # AI-bot blocking rules + Sitemap: line
  .nojekyll                 # Disables Jekyll processing so /_next/* assets are served
  img/                       # SVG icons
next.config.ts                # output: "export", trailingSlash: true, images.unoptimized
```

Output: `out/` (gitignored, deployed to GitHub Pages via `.github/workflows/gh-pages.yml`).

## Key Conventions

### Content
There is no blog/CMS — this is a single static About page plus footer contact links. Content lives directly in the React components (`components/About.tsx`, `lib/site.ts`), not in separate Markdown files.

### Styling
Tailwind CSS v4 (CSS-first config, no `tailwind.config.ts`). Design tokens live in `app/globals.css`:
- Static values (accent color, gray scale, fonts, max-width) are defined in the `@theme` block and become Tailwind utilities (e.g. `text-accent`, `border-gray-20`).
- `--background-color`/`--text-color` stay as plain CSS variables outside `@theme` because they flip under `@media (prefers-color-scheme: dark)`.
- Dark mode uses Tailwind's default `prefers-color-scheme` strategy — there is no class-based toggle.

### SEO
Site-wide metadata (title template, description, Open Graph, Twitter card, canonical, robots) is set via the Metadata API in `app/layout.tsx`. Structured data (Person/WebSite) is rendered by `components/JsonLd.tsx` on the home page. `public/robots.txt` is hand-maintained (not `app/robots.ts`) to preserve per-bot comments — do not remove the AI-crawler blocking rules without being asked.

### Static export constraints
`next.config.ts` sets `output: "export"`. This means: no ISR/revalidate, no Route Handlers, no Middleware, no Server Actions, and `next/image` requires `images.unoptimized: true`. Any future server-side feature (e.g. a contact form) requires leaving static export.

### Deploy
`.github/workflows/gh-pages.yml` builds with Node 20, then publishes `out/` via `actions/upload-pages-artifact` + `actions/deploy-pages`. Requires repo Settings → Pages → Source = "GitHub Actions".
