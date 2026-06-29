# syntax=docker/dockerfile:1
FROM node:20.11.0-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
COPY packages/backend/package.json ./packages/backend/
COPY packages/extension/package.json ./packages/extension/

RUN npm ci

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web

ARG VITE_API_URL=https://api.kurssikone.com/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=packages/web

FROM nginx:alpine

COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
