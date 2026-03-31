# syntax=docker/dockerfile:1
FROM node:20.11.0-alpine

WORKDIR /usr/src/app

COPY package*.json .
COPY nodemon.json .
COPY tsconfig.json .

RUN npm ci

CMD ["npm", "run", "dev-docker"]