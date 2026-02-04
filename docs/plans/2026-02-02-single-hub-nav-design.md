# Single Hub Navigation Path Per Subapp (Environment-Aware)

## Goal
Ensure every subapp has a single, consistent path back to Hub and that all internal links
adapt to the current environment (production vs. localhost). This prevents dev builds on
`*.localhost` from linking out to `*.krispc.fr`.

## Design Summary
- Add environment-aware base URLs for Hub and subapps.
- Expose base URLs and current app home via a shared context processor for templates.
- Use those base URLs in the global nav and sub-navs.
- Update Hub homepage app cards to use the same environment-aware base URLs.
- Emoty (Next.js) uses a public env var for the Hub link.

## Architecture
### Settings
Introduce base URL settings with production defaults and localhost defaults:
- `HUB_BASE_URL`, `KRISPC_BASE_URL`, `P2C_BASE_URL`, `PLEXUS_BASE_URL`, `EMO_BASE_URL`

### Context Processor
`krispc.context_processors.hub_urls`:
- Computes base URLs from settings.
- If request host is `localhost`/`*.localhost`, overrides base URLs to `http(s)://<subdomain>.localhost:<port>`.
- Exposes `current_app_home_url` based on `resolver_match.app_name`.

### Templates
Global nav (`templates/layouts/golden_base.html`):
- Brand link points to `current_app_home_url`.
- Hub nav item only appears when in Hub.
- Other app links use base URLs from the context processor.

Sub-navs (`p2c_base.html`, `plexus_base.html`, `the_base.html`):
- “↩ Hub” uses `hub_base_url`.

### Hub Homepage
`hub/views.py` uses the same base URL resolution logic for app cards, so
the “Visit” links remain local when the hub is accessed via `*.localhost`.

### Emoty
Use `NEXT_PUBLIC_HUB_BASE_URL` for the hub link, defaulting to the localhost hub in development.

## Testing
- Unit test for `hub/index` context to ensure localhost app URLs are used when the host is `hub.localhost:8000`.
- Template rendering test to ensure global nav links use localhost URLs in that environment.
