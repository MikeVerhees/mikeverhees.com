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
src/components/     PostList.astro, ThemeToggle.svelte (island)
src/pages/          Routes: /, /blog/, /blog/[slug]/, /tags/, /tags/[tag]/, feeds, sitemap, 404
src/lib/            Pure helpers (posts, feeds) and Astro data access (content.ts)
src/scripts/        Client-side TypeScript for islands
src/styles/         global.css with light/dark theme tokens
tests/unit/         bun test
tests/e2e/          Playwright, runs against the built dist/
```

## Conventions

- Put logic in pure functions under `src/lib` or `src/scripts` and unit test it; keep `.astro` files thin.
- Colors are CSS custom properties on `:root`; dark values are set both under `prefers-color-scheme: dark` (unless `data-theme="light"`) and `[data-theme="dark"]`.
- Use Bun for everything: `bun install`, `bun run <script>`, `bunx`. Don't add npm/pnpm lockfiles.
- Every change should pass `bun run check`, `bun run test`, `bun run build` and `bun run test:e2e`.
