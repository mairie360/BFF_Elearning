# syntax=docker/dockerfile:1.7
# --- Étape 1 : Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./

# Les identifiants GitHub Packages ne sont disponibles que pendant les installations.
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,target=/run/secrets/node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" npm ci

COPY . .
RUN npm run build

# [MODIFICATION] Idem pour l'install de prod
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc \
    --mount=type=secret,id=node_auth_token,target=/run/secrets/node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" npm ci --omit=dev --ignore-scripts

# --- Étape 2 : Runtime ---
FROM node:20-alpine
ENV NODE_ENV=production
RUN apk add --no-cache curl

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER node

# OPTIMISATION : On bride la heap à 180Mo pour tenir dans un limit K8s de 256Mo
ENV NODE_OPTIONS="--max-old-space-size=180"

EXPOSE 4006
CMD ["node", "dist/index.js"]
