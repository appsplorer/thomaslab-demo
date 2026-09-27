# Security Policy

Thomas Lab is a static research website. It does not provide visitor accounts, accept passwords, store visitor data in a database, or process payments.

## Reporting a security issue

If you discover a security issue affecting this website, report it privately to **CDThomas@uga.edu**. Include the affected URL, a concise description, and reproduction steps when appropriate.

Do not publish credentials, tokens, personal data, protected health information, restricted research data, or exploit details in a public issue.

## Security model

- Public pages are generated as static HTML, CSS, JavaScript, images, and permitted PDFs.
- GitHub is the source of truth and preserves the change history.
- Pages CMS relies on authorized GitHub access; this repository does not contain a separate lab password database.
- Source data is validated before every production build.
- CMS-authored rich text is sanitized at build time.
- The generated site is checked for broken local links, unsafe URL schemes, invalid page structure, unsafe new-tab links, missing assets, and accidental placeholder/internal text.
- The production Content Security Policy restricts scripts, frames, forms, workers, and external resources.
- Production CSS and JavaScript are protected with Subresource Integrity hashes; the Font Awesome stylesheet is also SRI-pinned.
- GitHub Actions used by the deployment workflow are pinned to exact commit SHAs.
- No credential, token, API key, or private research data is intended to be present in client-side code.

## Important limitation

Anything delivered to a web browser—HTML, CSS, JavaScript, images, fonts, and public PDFs—must be treated as public. Minification or obfuscation can make source less convenient to read, but it is not encryption and does not prevent retrieval by a visitor.

## Scope

Security reports should concern the Thomas Lab website or this repository's deployment configuration. University-wide systems, GitHub, Pages CMS, browsers, and third-party services have their own security programs and should be reported to the relevant provider when the issue is outside this repository.
