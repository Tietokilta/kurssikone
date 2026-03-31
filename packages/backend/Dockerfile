# syntax=docker/dockerfile:1
FROM node:20.11.0-alpine

WORKDIR /usr/src/app

COPY package*.json .

RUN npm ci
RUN npm install typescript nodemon ts-node -g

CMD ["npm", "run", "dev-docker"]