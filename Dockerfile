# ──────────────────────────────────────────────────────────────────────────────
# Production Node VPS image for the Aspire frontend (TanStack Start + Nitro).
# Build:  docker build -t aspire-frontend .
# Run:    docker run -p 3000:3000 --env-file .env.production aspire-frontend
# ──────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: install + build ------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Install bun (matches local toolchain). Falls back to npm if you prefer.
RUN apk add --no-cache bash curl unzip libstdc++ \
 && curl -fsSL https://bun.sh/install | bash \
 && ln -s /root/.bun/bin/bun /usr/local/bin/bun

COPY package.json bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile || bun install

# VITE_* env vars must be present at BUILD time (they are baked into the bundle).
# Pass them via --build-arg or an env_file in docker compose.
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_OIDC_POST_LOGOUT_REDIRECT_URI
ARG VITE_OIDC_SCOPE
ARG VITE_API_BASE_URL
ARG VITE_ORTHANC_BASE_URL
ARG VITE_ORTHANC_WADO_RS_ROOT
ARG VITE_OHIF_VIEWER_URL
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID \
    VITE_OIDC_REDIRECT_URI=$VITE_OIDC_REDIRECT_URI \
    VITE_OIDC_POST_LOGOUT_REDIRECT_URI=$VITE_OIDC_POST_LOGOUT_REDIRECT_URI \
    VITE_OIDC_SCOPE=$VITE_OIDC_SCOPE \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_ORTHANC_BASE_URL=$VITE_ORTHANC_BASE_URL \
    VITE_ORTHANC_WADO_RS_ROOT=$VITE_ORTHANC_WADO_RS_ROOT \
    VITE_OHIF_VIEWER_URL=$VITE_OHIF_VIEWER_URL

COPY . .
RUN bun run build

# ---- Stage 2: minimal runtime image -----------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# Nitro emits a self-contained server bundle in .output/. No node_modules needed.
COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
