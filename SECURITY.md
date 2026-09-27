# Security

Thomas Lab is deployed as a static site. It has no public database, server-side session, WordPress/PHP runtime, or custom website authentication endpoint.

## Controls

- GitHub is the source of truth and preserves change history.
- Pages CMS authentication is handled through its GitHub integration; no lab password database is stored in this repository.
- GitHub Actions uses minimum deployment permissions.
- Source data is validated before each build.
- Generated output is checked for broken local links, unsafe URL schemes, missing assets, placeholder content, and unsafe `target="_blank"` links.
- CMS-authored rich text is sanitized during generation and scripts use a restrictive Content Security Policy.
- External links opened in a new tab use `noopener noreferrer`.
- The public build contains no secrets.

## Reporting

Do not commit API keys, access tokens, private participant information, PHI, or restricted research data to this repository.

For a website security issue, contact the repository owner privately rather than publishing sensitive exploit details in a public issue.
