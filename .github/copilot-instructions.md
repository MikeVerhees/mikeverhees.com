# Copilot Instructions

Personal website and blog for Mike Verhees, built with Astro as a fully static site and deployed to GitHub Pages. See README.md for commands.

## Constraints

- The site must stay static (`output: "static"`). No server runtime, SSR adapter or API routes that need a server.
- JavaScript only for interactivity, as Svelte 5 islands (`.svelte` in src/components, used with a `client:*` directive). Prefer `client:visible`/`client:idle` over `client:load` when the island isn't needed immediately.
- Keep the AI-crawler rules in `public/robots.txt`.

## Layout

```
src/content/blog/   Blog posts (Markdown); schema in src/content.config.ts
src/partials/       About and footer Markdown, rendered on every page / home
src/layouts/        Base.astro (html shell, header, nav, footer)
src/components/     PostLinks.astro, ContactLinks.astro, and Svelte islands (ThemeToggle, CommandPalette, Terminal, Cat)
src/pages/          Routes: /, /blog/, /blog/[slug]/, /tags/, /tags/[tag]/, feeds, sitemap, 404
src/lib/            Pure helpers (posts, feeds) and Astro data access (content.ts)
src/scripts/        Client-side TypeScript for islands
src/styles/         global.css with light/dark theme tokens
tests/unit/         bun test
tests/e2e/          Playwright, runs against the built dist/
```

## Conventions

- Put logic in pure functions under `src/lib` or `src/scripts` and unit test it; keep `.astro` files thin.
- Colors are CSS custom properties on `:root` written as `light-dark(light, dark)` pairs; the used `color-scheme` (system preference, or the explicit `data-theme` on `<html>`) picks the value. Don't re-add per-theme blocks.
- Use Bun for everything: `bun install`, `bun run <script>`, `bunx`. Don't add npm/pnpm lockfiles.
- Lint and format with Biome (`bun run lint`, auto-fix with `bun run lint:fix`). Biome covers TS/JS/JSON/CSS in `biome.json`; `.astro` and `.svelte` files are covered by `bun run check` and the tests instead.
- Every change should pass `bun run lint`, `bun run check`, `bun run test`, `bun run build` and `bun run test:e2e`.
