# ⚡ STEG Status

> **Note:** "STEG" is the trademark of the national utility. This site is independent and says so visibly (disclaimer in the footer, FAQ, and share image). Keep that disclaimer if you keep the name.

Crowdsourced electricity outage map for Tunisia — like "Downdetector", but for the power grid, delegation by delegation. Citizens open the site, pick their delegation (or use their location), and press one button to report an outage. A zone only turns red on the map once enough independent people confirm it.

**Stack:** Node.js + Express + SQLite (better-sqlite3), vanilla JS + Leaflet frontend. One process, one small database file — deployable almost anywhere.

**Data:** all 24 governorates and 264 delegations of Tunisia, with French and Arabic names (boundaries from [riatelab/tunisie](https://github.com/riatelab/tunisie), OSM-derived). UI is bilingual French / Arabic (RTL).

## How confirmation works (Waze-style)

- Every report is timestamped and expires after **90 minutes** (`REPORT_TTL_MIN`), so zones clear automatically when reports stop.
- A delegation is **confirmed down (red)** when **10 distinct people** (`CONFIRM_THRESHOLD`, counted by daily-salted IP hash) report within that window.
- From **3 reports** (`SUSPECT_THRESHOLD`) the zone shows as **amber "suspected"**, so early signals are visible without being presented as fact.
- **"Power is back"** reports clear a zone early: 3+ restore reports (`RESTORE_MIN`) that amount to at least half of the active outage reports flip it to green "restoring".
- Anti-abuse: one report per person per delegation per **20 min**, max **12 reports/hour** per person, all enforced server-side.
- Privacy: raw IPs are never stored. Only a salted hash is kept, and the salt rotates daily.

All thresholds are environment variables — no code changes needed to tune them. Note: 10 confirmations works well for urban delegations; for sparsely populated ones you may want to lower `CONFIRM_THRESHOLD` (the amber "suspected" state exists precisely so smaller zones still surface).

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data.sqlite` | SQLite file location (put it on a persistent volume in production) |
| `CONFIRM_THRESHOLD` | `10` | Distinct reports needed to confirm an outage |
| `SUSPECT_THRESHOLD` | `3` | Reports needed to show the amber "suspected" state |
| `REPORT_TTL_MIN` | `90` | Minutes an outage report stays active |
| `RESTORE_WINDOW_MIN` | `30` | Window for "power is back" reports |
| `RESTORE_MIN` | `3` | Minimum restore reports to clear a zone |
| `REPORT_COOLDOWN_MIN` | `20` | Per-person, per-delegation cooldown |
| `IP_HOURLY_LIMIT` | `12` | Per-person hourly report cap |
| `HASH_SECRET` | random at boot | Set a fixed value so restarts don't reset dedup hashes |
| `TRUST_PROXY` | on | Set `0` only if NOT behind a proxy/load balancer |

## Deploying

This app needs a **persistent server** (it keeps a SQLite file), so pick a platform with a disk — not a static host.

### Railway (easiest)
1. Push this folder to a GitHub repo.
2. On [railway.app](https://railway.app): New Project → Deploy from GitHub repo.
3. Add a **Volume**, mount it at `/data`, and set env var `DB_PATH=/data/data.sqlite`.
4. Set `HASH_SECRET` to any long random string. Done — Railway detects Node and runs `npm start`.

### Render
1. New → Web Service → connect the repo. Build: `npm install`, Start: `npm start`.
2. Add a **Persistent Disk** mounted at `/data` and set `DB_PATH=/data/data.sqlite`.
3. Note: Render's free tier has no disk and sleeps; use the Starter plan for a real deployment.

### Fly.io
```bash
fly launch --no-deploy        # uses the included Dockerfile
fly volumes create data --size 1
# in fly.toml add:  [mounts]  source = "data"  destination = "/data"
fly secrets set HASH_SECRET=$(openssl rand -hex 24)
fly deploy
```

### Any VPS (DigitalOcean, Hetzner, OVH…)
```bash
npm install --omit=dev
HASH_SECRET=change-me PORT=3000 node server.js
# put nginx/caddy in front for HTTPS
```

### Scaling note
SQLite + the built-in 10-second status cache comfortably handles tens of thousands of visitors on one small instance. If the site goes national-news viral, the clean upgrade path is swapping SQLite for Postgres (the queries in `server.js` are 4 simple statements) and running multiple instances.

## SEO

The site ships SEO-ready. One required step after you know your final URL:

**Find-and-replace `https://steg-status.example` with your real URL** (e.g. `https://steg-status.up.railway.app` or `https://steg.meherbejaoui.com`) across `public/` — it appears in the canonical links, Open Graph tags, JSON-LD, `robots.txt` and `sitemap.xml`:

```bash
grep -rl "steg-status.example" public/ | xargs sed -i 's|https://steg-status.example|https://YOUR-REAL-URL|g'
```

What's already in place:
- Unique, keyword-rich `<title>` + meta description per page (map, history, stats), targeting real searches like "coupure électricité Tunisie aujourd'hui".
- Canonical URLs, `robots.txt` (API excluded from crawling), and `sitemap.xml`.
- Open Graph + Twitter Card tags with a branded 1200×630 share image (`og-image.png`) — this is what makes links look good when shared on Facebook, which is where Tunisian traffic will come from.
- JSON-LD structured data (`WebApplication` schema) for rich results.
- A crawlable FAQ on the homepage containing the question phrasings people actually type into Google, in French, plus the non-affiliation disclaimer.
- Fast-loading fundamentals search engines reward: preconnected fonts, deferred scripts, cached static assets, mobile-friendly layout.

Then two one-time actions:
1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)): add your URL as a property (verification is automatic if GA is already installed), then submit `sitemap.xml` under Indexing → Sitemaps. This gets you indexed in days instead of weeks and shows you which queries bring visitors.
2. If you use Bing/other engines: same process at Bing Webmaster Tools (it can import directly from Search Console).

Ongoing SEO for a site like this is mostly *content freshness* (the history/stats pages update themselves) and *backlinks* — every Facebook share, news mention, or forum post counts. The `?zone=` share links exist for exactly that.

## Google Analytics

The site ships with a GA4 loader in `public/analytics.js` that does nothing until you give it an ID:

1. Go to [analytics.google.com](https://analytics.google.com) → **Admin** (gear icon, bottom-left) → **Create** → **Property**.
2. Name it (e.g. "STEG Status"), set the time zone to Tunisia, click through the business questions.
3. Under the new property, choose **Data streams** → **Add stream** → **Web**, and enter the site URL.
4. Copy the **Measurement ID** (looks like `G-XXXXXXXXXX`).
5. Paste it into `GA_MEASUREMENT_ID` at the top of `public/analytics.js`. That's it — no other snippet needed (the loader injects the official gtag script itself, which also keeps our Content-Security-Policy strict).

The property appears in the same GA dashboard as your existing site — use the property switcher at the top-left to move between them. `anonymize_ip` is enabled by default in the loader.

## Security

Built in:
- **Content-Security-Policy** allowing only the exact CDNs used (cdnjs, Google Fonts, CARTO tiles, GA) — blocks injected scripts even if markup were compromised. Plus `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies.
- **Rate limiting at three levels**: 60 API requests/min per IP, 12 reports/hour per IP, one report per zone per 20 min — all server-side.
- **Input validation**: region IDs checked against the real list, request bodies capped at 2 KB, all SQL parameterized (no injection surface).
- **Privacy**: no accounts, no cookies from the app itself, IPs never stored (daily-rotating salted hash only).
- The `/api/status` and `/api/stats` responses are cached in-process, so even a flood of readers costs almost nothing.

Strongly recommended for a public Tunisian launch (this is the real DDoS answer):
- **Put Cloudflare's free plan in front.** Point your DNS through Cloudflare (orange cloud on), and you get edge caching, bot filtering, "Under Attack" mode, and free TLS. In Cloudflare, add a **Cache Rule** for `/`, `/data/*`, `*.js`, `*.css` (cache everything, 1h) and a **Rate limiting rule** on `/api/report` (e.g. 10 req/min per IP at the edge). Your origin then only sees a fraction of the traffic.
- Set a fixed `HASH_SECRET` env var so dedup survives restarts.
- Keep `TRUST_PROXY` on (default) behind Cloudflare/PaaS so rate limits apply to real visitor IPs, not the proxy's.

One honest limitation to know about: report abuse is limited by IP, so someone cycling mobile-data IPs could inflate counts. The 10-person threshold, report expiry, and Cloudflare bot rules make this expensive, but no crowdsourced system is fully immune — Waze has the same property.

## Using a subdomain of meherbejaoui.com

Yes — and it doesn't interfere with your GitHub Pages site at all. GitHub Pages only "owns" the names you've pointed at it (`www` / apex); every other subdomain is free for you to use. This app can't run **on** GitHub Pages itself (Pages is static-only, and this app has a server + database), but the subdomain part is just DNS:

1. Deploy the app on Railway/Render/Fly (above) and note the app's hostname (e.g. `kahraba-production.up.railway.app`).
2. In your DNS provider (wherever meherbejaoui.com's DNS is managed — check your registrar or Cloudflare), add:
   `CNAME  kahraba  →  kahraba-production.up.railway.app`
3. In the hosting platform's settings, add `kahraba.meherbejaoui.com` as a **custom domain**. It will verify the DNS and issue an HTTPS certificate automatically (usually < 15 min).

Result: `https://kahraba.meherbejaoui.com` serves this app, `https://www.meherbejaoui.com` keeps serving GitHub Pages, zero cost for the domain part. This also means you don't need to buy a new domain unless you want a standalone brand.

## API

- `GET /api/status` → `{ generated_at, thresholds, totals, regions: { "TN13A": { status, down, restored, last } } }`
- `POST /api/report` with `{ "regionId": "TN13A", "type": "down" | "restored" }` → `200 {ok}`, `409` already reported, `429` rate limited.
- `GET /api/history?limit=100` → confirmed outage events (zone names in FR/AR, start, end, duration, peak reports).
- `GET /api/stats` → daily report volume (14 d), most affected zones (7 d), events per governorate (30 d), totals and average duration.

---
Made by **Meher Bejaoui** and **Claude**.
