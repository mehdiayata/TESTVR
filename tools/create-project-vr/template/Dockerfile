FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci && mkdir -p /app/.certs && chown -R node:node /app

USER node
COPY --chown=node:node . .
