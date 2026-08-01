# syntax=docker/dockerfile:1
FROM node:20.11.0-alpine AS builder

WORKDIR /app

COPY package-lock.json .
COPY packages/backend/package.json .
COPY packages/backend/tsconfig.json .

RUN npm install

COPY packages/backend/src ./src

RUN npm run build

FROM node:20.11.0-alpine

WORKDIR /app

COPY package-lock.json .
COPY packages/backend/package.json .

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

WORKDIR /app/dist
CMD ["node", "src/index.js"]
