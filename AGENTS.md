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

## Other notes

User IDs are secrets, only the user themselves should know their user ID. Make sure no change makes user IDs visible in the frontend or extension.
