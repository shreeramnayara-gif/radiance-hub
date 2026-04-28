# Aspire Frontend — Node VPS Deployment

This app is a TanStack Start application that builds to a self-contained Node.js
server bundle (via Nitro). It is **not** deployed to Cloudflare Workers/Pages.

---

## 1. Prerequisites on the VPS

- Node.js **22.x** LTS (or 20.x ≥ 20.11)
- `bun` (recommended) **or** `npm` for installing/building
- A reverse proxy (nginx / Caddy) terminating TLS and forwarding to the app
- Optional: `pm2` for process management, or `systemd` if you prefer

---

## 2. Configure environment

Copy `.env.example` to `.env.production` and fill in real values:

```bash
cp .env.example .env.production
```

> ⚠️ All `VITE_*` variables are **baked into the JS bundle at build time**.
> They must be present in the shell environment **before** `bun run build` runs.
> Changing them later requires a rebuild.

Server-only secrets (no `VITE_` prefix) are read at runtime from `process.env`
inside server functions and route handlers.

---

## 3. Build

```bash
# load build-time env vars
set -a; source .env.production; set +a

bun install --frozen-lockfile
bun run build
```

The build emits `.output/`, a fully bundled Node server. No `node_modules` are
required at runtime.

---

## 4. Run

### Option A — PM2 (recommended)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup            # follow the printed instructions to enable on boot
```

### Option B — plain Node

```bash
NODE_ENV=production PORT=3000 HOST=0.0.0.0 \
  node .output/server/index.mjs
```

### Option C — systemd

`/etc/systemd/system/aspire-frontend.service`:

```ini
[Unit]
Description=Aspire Frontend
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/aspire-frontend
EnvironmentFile=/var/www/aspire-frontend/.env.production
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aspire-frontend
```

### Option D — Docker

```bash
docker build \
  --build-arg VITE_OIDC_AUTHORITY=https://kc.example.com/realms/aspire \
  --build-arg VITE_OIDC_CLIENT_ID=aspire-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com/api \
  -t aspire-frontend .

docker run -d -p 3000:3000 --restart unless-stopped \
  --env-file .env.production --name aspire-frontend aspire-frontend
```

---

## 5. Reverse proxy (nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name app.example.com;

  ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
  }
}
```

---

## 6. Updating

```bash
git pull
set -a; source .env.production; set +a
bun install --frozen-lockfile
bun run build
pm2 reload aspire-frontend     # or: systemctl restart aspire-frontend
```

---

## 7. Keycloak / OIDC notes

After deployment, set the following in Keycloak for the `aspire-frontend`
client:

- **Valid redirect URIs**: `https://app.example.com/auth/callback`
- **Valid post-logout redirect URIs**: `https://app.example.com/`
- **Web origins**: `https://app.example.com`
- **Access type**: public (PKCE)
