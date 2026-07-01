# KurssiKone

![Example of KurssiKone](example_1.jpg)

A course review platform for Aalto University courses. Available as a browser extension and a standalone website.

## Project Structure

This is a monorepo containing three packages:

```
kurssikone/
├── packages/
│   ├── extension/    # Browser extension (Chrome & Firefox)
│   ├── backend/      # Express.js API server
│   └── web/          # Standalone React website (Vite)
└── package.json      # Root package with shared scripts
```

## Getting Started

Install dependencies:

```bash
npm install
```

Lint and tests are run automatically via CI on all pull requests.

## Packages

### Extension (`packages/extension`)

Browser extension that integrates directly into Aalto's Sisu system.

**Development:**

```bash
cd packages/extension
npm install
npm run dev
```

**Build extension**

```bash
npm run build:extension
```

The extension will be built in the `builds` folder.

### Backend (`packages/backend`)

Express.js API server with PostgreSQL database using Sequelize ORM.

**Development with Docker:**

```bash
cd packages/backend
cp .env.example .env  # Edit with your settings
docker-compose up
```

**Development without Docker:**

```bash
cd packages/backend
npm install
npm run dev
```

### Web (`packages/web`)

Standalone React website built with Vite.

**Development:**

```bash
cd packages/web
npm install
npm run dev
```

**Build:**

```bash
npm run build
```

**Environment Variables:**

Create a `.env` file:

```
VITE_API_URL=http://localhost:3001/api
```

## System Requirements

- Node.js v20+
- npm 10+
- Docker (optional, for backend development)

## Features

- View course ratings (Quality, Workload, Difficulty)
- Read detailed course reviews
- Write and edit your own reviews
- Anonymous user system with portable user IDs
- Browsing exams for courses

## Releases & deployment

The website and the backend are deployed to production on every push to main automatically.

### Browser extension releases

1. Add release notes under `## [Unreleased]` in `packages/extension/CHANGELOG.md` as you work.
2. Run `npm run release:extension` from the repo root (append `-- minor` or `-- major` for non-patch bumps).
3. `release-it` bumps the version in `package.json` and `manifest.json`, builds the extension, updates the changelog, commits, tags (`extension-vX.Y.Z`), pushes, and creates a GitHub Release with zip artifacts.
4. The tag triggers the `extension-publish.yml` workflow, which publishes to Chrome Web Store and Firefox Add-ons automatically.

For development, this also means that all backend changes have to be backend compatible. So if API has a breaking change, might need to make a v2 of the API.

## GitHub Secrets

All secrets are configured in the repo (Settings > Secrets and variables > Actions).

| Secret | Used by | Description | How to get |
|---|---|---|---|
| `AZURE_CLIENT_ID` | `deploy.yml` | Azure AD app (service principal) client ID | [Azure Portal](https://portal.azure.com/) > App registrations |
| `AZURE_SUBSCRIPTION_ID` | `deploy.yml` | Azure subscription ID | [Azure Portal](https://portal.azure.com/) > Subscriptions |
| `AZURE_TENANT_ID` | `deploy.yml` | Azure AD tenant ID | [Azure Portal](https://portal.azure.com/) > Azure Active Directory |
| `CHROME_EXTENSION_ID` | `extension-publish.yml` | Extension ID from Chrome Web Store URL | `https://chromewebstore.google.com/detail/kurssikone/<ID>` |
| `CHROME_CLIENT_ID` | `extension-publish.yml` | Google Cloud OAuth 2.0 client ID | [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials > OAuth 2.0 Client (Desktop app) |
| `CHROME_CLIENT_SECRET` | `extension-publish.yml` | Google Cloud OAuth 2.0 client secret | Same as above |
| `CHROME_REFRESH_TOKEN` | `extension-publish.yml` | OAuth 2.0 refresh token | Run `npx chrome-webstore-upload-keys` |
| `FIREFOX_API_KEY` | `extension-publish.yml` | AMO JWT issuer | [addons.mozilla.org/developers/addon/api/key/](https://addons.mozilla.org/developers/addon/api/key/) |
| `FIREFOX_API_SECRET` | `extension-publish.yml` | AMO JWT secret | Same as above |

Chrome Web Store notes: enable the **Chrome Web Store API** in Google Cloud Console, and set the OAuth consent screen to **"In production"** (not "Testing") — otherwise the refresh token expires after 7 days.
