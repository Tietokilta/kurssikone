# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/nodemon.json ./packages/backend/

RUN npm ci

COPY packages/backend/src ./packages/backend/src

WORKDIR /app/packages/backend
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

WORKDIR /app/packages/backend/dist
CMD ["node", "src/index.js"]