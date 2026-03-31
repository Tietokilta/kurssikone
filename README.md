# Kurssikompassi

A course review platform for Aalto University courses. Available as a browser extension and a standalone website.

## Project Structure

This is a monorepo containing three packages:

```
kurssikompassi/
├── packages/
│   ├── extension/    # Browser extension (Chrome & Firefox)
│   ├── backend/      # Express.js API server
│   └── web/          # Standalone React website
```

## Packages

### Extension (`packages/extension`)

Browser extension that integrates directly into Aalto's Sisu system.

**Development:**

```bash
cd packages/extension
npm install
npm run dev
```

**Build:**

```bash
npm run make-release
```

The extension will be built in the `builds` folder.

### Backend (`packages/backend`)

Express.js API server with PostgreSQL database.

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

Standalone React website with the same functionality as the extension.

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

## License

MIT
