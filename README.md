# Thomas Lab Website

Production-oriented static lab website for Thomas Lab at the University of Georgia College of Pharmacy. Content is separated from presentation so Pages CMS can maintain lab information without editing HTML.

## Architecture

- `data/` — editable structured lab content
- `assets/` — shared light-theme CSS and interaction JavaScript
- `scripts/build.mjs` — dependency-free static generator
- `_site/` — generated during GitHub Actions deployment only
- `.pages.yml` — Pages CMS admin configuration (completed in Part 6)

The deployment is intentionally database-free and produces static HTML for speed, security, and SEO.
