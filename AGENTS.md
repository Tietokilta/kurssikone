# Kurssikompassi

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
npm run test
```
