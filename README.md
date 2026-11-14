# MikeVerhees.com

My personal website, built with [Astro](https://astro.build/) as a fully static site. JavaScript is only shipped for interactive Svelte islands, such as the theme toggle.

## Development

Uses [Bun](https://bun.sh/) as package manager, runtime and unit test runner (version pinned in `package.json` under `packageManager`).

```bash
bun install
bun run dev        # dev server at http://localhost:4321, drafts included
bun run build      # production build to dist/, drafts excluded
bun run preview    # serve dist/ locally
```

## Writing a post

Add a Markdown file to `src/content/blog/`. The file name becomes the URL, so `my-first-post.md` is published at `/blog/my-first-post/`.

```md
---
title: My first post
description: Optional, used for the meta description.
date: 2026-11-13
tags: [web, astro]
draft: false   # optional; true hides the post from production builds
---

Post content in Markdown.
```

The frontmatter is checked against the schema in `src/content.config.ts`, so a missing title or invalid date fails the build. See `src/content/blog/example-post.md` for a template.

## Adding interactivity

Interactive pieces are [Svelte](https://svelte.dev/) 5 components in `src/components/`, used as islands:

```astro
---
import ThemeToggle from "../components/ThemeToggle.svelte";
---
<ThemeToggle client:load />      <!-- hydrate immediately -->
<Search client:visible />        <!-- hydrate when scrolled into view -->
<Chart client:idle />            <!-- hydrate when the browser is idle -->
```

Without a `client:*` directive a Svelte component is rendered to static HTML at build time and ships no JavaScript. Keep logic that doesn't need the DOM in plain TypeScript modules (like `src/scripts/theme.ts`) so it can be unit tested.

## Tests

```bash
bun run lint       # Biome lint + format check (auto-fix with bun run lint:fix)
bun run check      # type-check .astro and .ts files
bun run test       # unit tests with bun test (tests/unit)
bun run build && bun run test:e2e   # Playwright end-to-end tests against dist/ (tests/e2e)
```

The first time, install the Playwright browser with `bunx playwright install chromium`.

- **Unit tests** (`bun test`) cover helpers (`src/lib`), feed and sitemap output, theme logic, and Svelte components rendered with `svelte/server` (`.svelte` imports are compiled by `tests/support/svelte-plugin.ts`, preloaded via `bunfig.toml`). `.astro` components are covered by the end-to-end tests.
- **End-to-end tests** load every page in the sitemap, check feeds and the 404 page, run an axe accessibility check in light and dark mode, and test the theme toggle with and without JavaScript, on desktop and mobile viewports.

## Deployment

GitHub Actions (`.github/workflows/gh-pages.yml`) runs the Biome lint, type-check, unit tests, build and end-to-end tests on every push and pull request. Pushes to `main` that pass are deployed to GitHub Pages. Third-party actions are pinned to commit SHAs.
