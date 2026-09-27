# Thomas Lab Website

A production-oriented, static research-lab website for Thomas Lab at the University of Georgia College of Pharmacy.

## Live site

https://appsplorer.github.io/thomaslab-demo/

## Content architecture

The website is intentionally database-free. Editors maintain structured content in Pages CMS; GitHub stores every revision; GitHub Actions validates, builds, and deploys static HTML.

- `data/site.json` — lab identity, hero, research areas, homepage Lab Life gallery, social links and SEO
- `data/publications.json` — publication records, external links and optional uploaded PDFs
- `data/people.json` — PI, students, staff, collaborators and alumni
- `data/projects.json` — project cards and detail pages
- `data/news.json` — internal news pages plus optional external source links
- `data/opportunities.json` — PhD/RA/student/staff/collaboration listings
- `media/images/` — editor-uploaded images
- `media/pdfs/` — PDFs that the lab is permitted to distribute
- `.pages.yml` — Pages CMS admin schema
- `scripts/build.mjs` — dependency-free static generator
- `scripts/check.mjs` — source validation
- `scripts/check-output.mjs` — generated-link and output validation

## Admin workflow

1. Open https://app.pagescms.org/
2. Sign in with GitHub and open `appsplorer/thomaslab-demo`.
3. Edit Site settings, Publications, People & alumni, Projects, News, or Opportunities.
4. Manage the homepage-only **Lab Life** gallery under **Site settings → Homepage photo gallery**. Add alt text to every photo, choose an optional crop focus, and mark at most one visible photo as featured.
5. Upload images/PDFs directly from the relevant form. Gallery images should preferably be JPEG/WebP/AVIF and under 8 MB.
6. Save. The commit to `main` automatically triggers validation and deployment.
7. The optional **Rebuild / deploy website** action can trigger the workflow again without changing content.

Publication PDFs should only be uploaded when the lab has the legal right to redistribute that file. Linking to DOI/PubMed/publisher pages is preferred when full-text redistribution rights are unclear.

## Local build

No npm dependencies are required.

```bash
npm run verify
```

The generated site is written to `_site/`.

## Design and accessibility

The public site uses a standalone Thomas Lab identity with UGA-inspired Bulldog Red, neutral light surfaces, restrained orbital motion, keyboard-accessible navigation, mobile drawer navigation, reduced-motion support, responsive card layouts, semantic static pages, and a keyboard-accessible homepage photo viewer. Continuous decorative animations pause when off-screen to reduce unnecessary CPU/GPU work.

## Licence

This site is derived from a BSD-3-Clause-licensed Greene Laboratory template. The original licence is retained in `LICENSE.md`.
