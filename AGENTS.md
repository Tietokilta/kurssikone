# KurssiKone

Monorepo for a course review/tracking system with browser extension, web app, and backend.

## Directory Structure

```
packages/
  backend/    # Express + PostgreSQL API (Sequelize ORM)
  web/        # React + Vite + Tailwind frontend
  extension/  # Browser extension (Chrome/Firefox)
  shared/     # Shared types, utilities, and components
```

## Development

```bash
# Install dependencies (run from each package directory)
npm install

# Run all services (web, extension, backend)
npm run dev
```

## Linting

```bash
# Lint all packages
npm run lint

# Lint individual package
npm run lint --prefix packages/web
npm run lint --prefix packages/backend
npm run lint --prefix packages/extension
```

## Tests

```bash
# All packages (extension runs unit tests only; no Puppeteer)
npm run test

# Extension browser E2E (Puppeteer, live Sisu + API) — run separately when needed
npm run test:e2e
```

## Releases & deployment

The website and the backend are deployed to production on every push to main automatically.

### Browser extension releases

1. Add release notes under `## [Unreleased]` in `packages/extension/CHANGELOG.md` as you work.
2. Run `npm run release:extension` from the repo root (append `-- minor` or `-- major` for non-patch bumps).
3. `release-it` bumps the version in `package.json` and `manifest.json`, builds the extension, updates the changelog, commits, tags (`extension-vX.Y.Z`), pushes, and creates a GitHub Release with zip artifacts.
4. The tag triggers the `extension-publish.yml` workflow, which publishes to Chrome Web Store and Firefox Add-ons automatically.

Required GitHub Secrets for store publishing: `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `FIREFOX_API_KEY`, `FIREFOX_API_SECRET`.

For development, this also means that all backend changes have to be backend compatible. So if API has a breaking change, might need to make a v2 of the API.

## Other notes

User IDs are secrets, only the user themselves should know their user ID. Make sure no change makes user IDs visible in the frontend or extension.
