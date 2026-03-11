# Copilot Instructions

## Project Overview

Personal website and blog for Mike Verhees, built with [Eleventy (11ty) v2](https://www.11ty.dev/). Outputs a static site to `_site/` and deploys to GitHub Pages.

## Commands

```bash
npm start        # Dev server with live reload (also enables draft posts)
npm run build    # Production build → _site/
npm run debug    # Build with Eleventy debug logging
```

No test or lint commands exist.

## Architecture

```
content/         # All source content (Eleventy input dir)
_includes/       # Layouts and partials
  layouts/       # base.njk → home.njk / post.njk
  partials/      # footer.md, about.md, postslist.njk
_data/           # Global data (metadata.js: site title, URL, author)
public/          # Static assets (passthrough copy to _site/)
  css/           # index.css, prism-diff.css, message-box.css
  img/           # SVG icons
eleventy.config.js          # Main config: plugins, filters, shortcodes
eleventy.config.images.js   # Responsive image shortcode via eleventy-img
eleventy.config.drafts.js   # Draft post handling (excluded from prod builds)
```

Output: `_site/` (gitignored, deployed to GitHub Pages via `gh-pages.yml`).

## Key Conventions

### Templates
- Primary templating language is **Nunjucks** (`.njk`). Markdown files also support Nunjucks templating.
- Layout chain: `base.njk` → `home.njk` or `post.njk`

### CSS Bundling
CSS is **inlined** into `<style>` tags at build time using the `eleventy-plugin-bundle` shortcodes:
```njk
{%- css %}/* component styles here */{%- endcss %}
{%- getBundle "css" %}  {# outputs all collected CSS #}
```
Add per-template styles via `{% css %}` blocks in any layout or template; they are accumulated and emitted once in `base.njk`.

### Blog Posts
- Posts live in `content/blog/` as Markdown files.
- Must include `tags: ["posts"]` (or via `content/blog/blog.11tydata.js`) to appear in `collections.posts`.
- Mark a post as a draft with `draft: true` in frontmatter — draft posts are excluded from production builds but visible during `npm start`.

### Image Shortcode
```njk
{% image "src/path/or/url.jpg", "Alt text", [widths], "sizes attr" %}
```
Generates responsive `<picture>` elements with avif/webp/original formats. Images output to `_site/img/`.

### Filters (defined in eleventy.config.js)
| Filter | Usage |
|--------|-------|
| `readableDate` | `{{ date \| readableDate }}` → "11 March 2026" |
| `htmlDateString` | `{{ date \| htmlDateString }}` → "2026-03-11" (for `<time datetime>`) |
| `head(n)` | `{{ collection \| head(3) }}` — first n items (negative = last n) |
| `getAllTags` | Used in tag pages |
| `filterTagList` | Strips system tags: `all`, `nav`, `post`, `posts` |

### Global Data
Site-wide variables come from `_data/metadata.js`: `metadata.title`, `metadata.url`, `metadata.author`, etc. These are available in all templates as `metadata.*`.

### Navigation
Pages opt into the nav via frontmatter:
```yaml
eleventyNavigation:
  key: Blog
  order: 1
```
Rendered in `base.njk` using `{% set navPages = collections.all | eleventyNavigation %}`.
