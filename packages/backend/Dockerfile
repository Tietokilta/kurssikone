# syntax=docker/dockerfile:1
FROM node:20.11.0-alpine

WORKDIR /usr/src/app

COPY package-lock.json .
COPY packages/backend/package.json .
COPY packages/backend/nodemon.json .
COPY packages/backend/tsconfig.json .

RUN npm ci

CMD ["npm", "run", "dev-docker"]