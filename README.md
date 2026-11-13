# MikeVerhees.com

My personal website, built with [Astro](https://astro.build/) as a fully static site. JavaScript is only shipped for small interactive pieces (islands), such as the theme toggle.

## Development

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server at http://localhost:4321, drafts included
npm run build      # production build to dist/, drafts excluded
npm run preview    # serve dist/ locally
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

Interactive pieces are small web components written in TypeScript. See `src/components/ThemeToggle.astro` and `src/scripts/theme-toggle.ts`: the component's `<script>` is bundled by Astro and only loaded on pages that use it. Keep logic that can be tested without a browser in a separate module (like `src/scripts/theme.ts`).

## Tests

```bash
npm run check      # type-check .astro and .ts files
npm test           # Vitest unit tests (tests/unit)
npm run build && npm run test:e2e   # Playwright end-to-end tests against dist/ (tests/e2e)
```

The first time, install the Playwright browser with `npx playwright install chromium`.

- **Unit tests** cover helpers (`src/lib`), feed and sitemap output, theme logic, and components rendered with Astro's Container API.
- **End-to-end tests** load every page in the sitemap, check feeds and the 404 page, run an axe accessibility check in light and dark mode, and test the theme toggle with and without JavaScript, on desktop and mobile viewports.

## Deployment

GitHub Actions (`.github/workflows/gh-pages.yml`) runs the type-check, unit tests, build and end-to-end tests on every push and pull request. Pushes to `main` that pass are deployed to GitHub Pages.
