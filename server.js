/**
 * STEG Status — crowdsourced electricity outage map for Tunisia.
 *
 * Single-process app: Express serves the static frontend + a small JSON API,
 * with SQLite (better-sqlite3) for storage. Designed to run anywhere Node runs
 * (Railway, Render, Fly.io, a VPS...).
 */

const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration (all overridable via environment variables)
// ---------------------------------------------------------------------------
const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'data.sqlite'),

  // A delegation is marked DOWN (confirmed) once this many distinct people
  // report an outage within REPORT_TTL_MIN minutes.
  CONFIRM_THRESHOLD: parseInt(process.env.CONFIRM_THRESHOLD || '3', 10),

  // Below the confirm threshold but at/above this, the zone is shown as
  // "suspected" (reports coming in, not yet confirmed).
  SUSPECT_THRESHOLD: parseInt(process.env.SUSPECT_THRESHOLD || '1', 10),

  // How long an outage report stays "alive". Old reports decay away, so a
  // zone automatically clears if people stop reporting.
  REPORT_TTL_MIN: parseInt(process.env.REPORT_TTL_MIN || '90', 10),

  // "Power is back" reports: window and minimum count needed to clear a zone
  // early (must also be at least half the number of active outage reports).
  RESTORE_WINDOW_MIN: parseInt(process.env.RESTORE_WINDOW_MIN || '30', 10),
  RESTORE_MIN: parseInt(process.env.RESTORE_MIN || '2', 10),

  // Anti-abuse: one report per person per delegation per cooldown window,
  // and a global hourly cap per person.
  REPORT_COOLDOWN_MIN: parseInt(process.env.REPORT_COOLDOWN_MIN || '20', 10),
  IP_HOURLY_LIMIT: parseInt(process.env.IP_HOURLY_LIMIT || '12', 10),

  // General API rate limit (all /api/* requests) per IP per minute.
  API_PER_MINUTE: parseInt(process.env.API_PER_MINUTE || '60', 10),

  // "I have power" confirmations show a subtle green tint. They live shorter
  // than outage reports (power state changes fast) and never override red.
  WORKING_TTL_MIN: parseInt(process.env.WORKING_TTL_MIN || '45', 10),
  WORKING_MIN: parseInt(process.env.WORKING_MIN || '3', 10),

  // Data retention.
  REPORT_RETENTION_DAYS: parseInt(process.env.REPORT_RETENTION_DAYS || '35', 10),
  EVENT_RETENTION_DAYS: parseInt(process.env.EVENT_RETENTION_DAYS || '365', 10),

  // Set to "1" when running behind a reverse proxy / PaaS load balancer so
  // the real client IP is read from X-Forwarded-For.
  TRUST_PROXY: process.env.TRUST_PROXY !== '0',
};

// ---------------------------------------------------------------------------
// Load the list of valid delegation IDs from the bundled GeoJSON
// ---------------------------------------------------------------------------
const geo = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public', 'data', 'delegations.geojson'), 'utf8')
);
const REGIONS = new Map(); // id -> names
for (const f of geo.features) {
  const p = f.properties;
  REGIONS.set(p.id, {
    del_fr: p.del_fr, del_ar: p.del_ar,
    gouv_id: p.gouv_id, gouv_fr: p.gouv_fr, gouv_ar: p.gouv_ar,
  });
}
console.log(`Loaded ${REGIONS.size} delegations.`);

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
const db = new Database(CONFIG.DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('down', 'restored', 'working')),
    ip_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reports_region_time ON reports (region_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_ip_time ON reports (ip_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_time ON reports (created_at);

  -- One row per confirmed outage: created when a zone crosses the confirm
  -- threshold, closed when it clears. This is the source of the history page.
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    peak_reports INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_events_region ON events (region_id, started_at);
  CREATE INDEX IF NOT EXISTS idx_events_started ON events (started_at);
`);

// Migration: databases created before the "working" report type have a CHECK
// constraint that rejects it. SQLite can't ALTER a CHECK, so if the old
// constraint is present we rebuild the table (data preserved).
(() => {
  const sql = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='reports'"
  ).get();
  if (sql && !sql.sql.includes("'working'")) {
    console.log('Migrating reports table to allow "working" reports...');
    db.exec('BEGIN');
    db.exec(`
      CREATE TABLE reports_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('down', 'restored', 'working')),
        ip_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      INSERT INTO reports_new SELECT * FROM reports;
      DROP TABLE reports;
      ALTER TABLE reports_new RENAME TO reports;
      CREATE INDEX IF NOT EXISTS idx_reports_region_time ON reports (region_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_ip_time ON reports (ip_hash, created_at);
      CREATE INDEX IF NOT EXISTS idx_reports_time ON reports (created_at);
    `);
    db.exec('COMMIT');
    console.log('Migration complete.');
  }
})();

const stmts = {
  insert: db.prepare(
    'INSERT INTO reports (region_id, type, ip_hash, created_at) VALUES (?, ?, ?, ?)'
  ),
  recentByIpRegion: db.prepare(
    'SELECT COUNT(*) AS n FROM reports WHERE ip_hash = ? AND region_id = ? AND type = ? AND created_at >= ?'
  ),
  recentByIp: db.prepare(
    'SELECT COUNT(*) AS n FROM reports WHERE ip_hash = ? AND created_at >= ?'
  ),
  activeDown: db.prepare(
    `SELECT region_id, COUNT(DISTINCT ip_hash) AS n, MAX(created_at) AS last
     FROM reports WHERE type = 'down' AND created_at >= ? GROUP BY region_id`
  ),
  activeRestored: db.prepare(
    `SELECT region_id, COUNT(DISTINCT ip_hash) AS n
     FROM reports WHERE type = 'restored' AND created_at >= ? GROUP BY region_id`
  ),
  activeWorking: db.prepare(
    `SELECT region_id, COUNT(DISTINCT ip_hash) AS n
     FROM reports WHERE type = 'working' AND created_at >= ? GROUP BY region_id`
  ),
  pruneReports: db.prepare('DELETE FROM reports WHERE created_at < ?'),
  pruneEvents: db.prepare('DELETE FROM events WHERE ended_at IS NOT NULL AND started_at < ?'),

  openEvents: db.prepare('SELECT id, region_id, peak_reports FROM events WHERE ended_at IS NULL'),
  openEvent: db.prepare('INSERT INTO events (region_id, started_at, peak_reports) VALUES (?, ?, ?)'),
  closeEvent: db.prepare('UPDATE events SET ended_at = ? WHERE id = ?'),
  bumpPeak: db.prepare('UPDATE events SET peak_reports = ? WHERE id = ? AND peak_reports < ?'),

  history: db.prepare(
    `SELECT region_id, started_at, ended_at, peak_reports FROM events
     ORDER BY started_at DESC LIMIT ?`
  ),
  dailyReports: db.prepare(
    `SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n
     FROM reports WHERE type = 'down' AND created_at >= ? GROUP BY day ORDER BY day`
  ),
  topRegions: db.prepare(
    `SELECT region_id, COUNT(*) AS n FROM reports
     WHERE type = 'down' AND created_at >= ? GROUP BY region_id ORDER BY n DESC LIMIT 10`
  ),
  eventStats: db.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) AS ongoing,
            AVG(CASE WHEN ended_at IS NOT NULL THEN ended_at - started_at END) AS avg_ms
     FROM events WHERE started_at >= ?`
  ),
  govBreakdown: db.prepare(
    `SELECT region_id, COUNT(*) AS n FROM events WHERE started_at >= ? GROUP BY region_id`
  ),
};

// Housekeeping: prune old data hourly.
setInterval(() => {
  const dayMs = 24 * 3600 * 1000;
  stmts.pruneReports.run(Date.now() - CONFIG.REPORT_RETENTION_DAYS * dayMs);
  stmts.pruneEvents.run(Date.now() - CONFIG.EVENT_RETENTION_DAYS * dayMs);
}, 3600 * 1000).unref();

// ---------------------------------------------------------------------------
// Privacy: IPs are never stored. We keep a salted hash, and the salt rotates
// daily, so hashes cannot be correlated across days.
// ---------------------------------------------------------------------------
const bootSecret = process.env.HASH_SECRET || crypto.randomBytes(16).toString('hex');
function ipHash(ip) {
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(`${bootSecret}:${day}:${ip}`).digest('hex').slice(0, 24);
}

// ---------------------------------------------------------------------------
// Status computation (Waze-style confirmation + decay) + event tracking
// ---------------------------------------------------------------------------
const openEventByRegion = new Map(); // region_id -> { id, peak }
for (const e of stmts.openEvents.all()) {
  openEventByRegion.set(e.region_id, { id: e.id, peak: e.peak_reports });
}

function computeStatus() {
  const now = Date.now();
  const downSince = now - CONFIG.REPORT_TTL_MIN * 60 * 1000;
  const restoredSince = now - CONFIG.RESTORE_WINDOW_MIN * 60 * 1000;

  const workingSince = now - CONFIG.WORKING_TTL_MIN * 60 * 1000;

  const restored = new Map();
  for (const r of stmts.activeRestored.all(restoredSince)) restored.set(r.region_id, r.n);
  const working = new Map();
  for (const r of stmts.activeWorking.all(workingSince)) working.set(r.region_id, r.n);

  const regions = {};
  const confirmedNow = new Set();
  let confirmed = 0, suspected = 0, workingCount = 0, totalReports = 0;

  for (const r of stmts.activeDown.all(downSince)) {
    const down = r.n;
    const rest = restored.get(r.region_id) || 0;
    totalReports += down;

    let status = 'ok';
    if (rest >= CONFIG.RESTORE_MIN && rest * 2 >= down) {
      status = 'restoring';
    } else if (down >= CONFIG.CONFIRM_THRESHOLD) {
      status = 'down';
      confirmed++;
      confirmedNow.add(r.region_id);
    } else if (down >= CONFIG.SUSPECT_THRESHOLD) {
      status = 'suspected';
      suspected++;
    }

    regions[r.region_id] = { status, down, restored: rest, working: working.get(r.region_id) || 0, last: r.last };
  }

  // "Working" confirmations (1C): show a subtle green tint ONLY in zones that
  // aren't already flagged by outage reports. Green never overrides red,
  // amber, or restoring — different neighborhoods differ, and a confirmed
  // outage must always stay visible.
  for (const [regionId, n] of working) {
    if (regions[regionId]) continue; // zone already has outage reports; leave as-is
    if (n >= CONFIG.WORKING_MIN) {
      regions[regionId] = { status: 'working', down: 0, restored: 0, working: n, last: now };
      workingCount++;
    }
  }

  // Event transitions: open events for newly confirmed zones, close events
  // for zones that are no longer confirmed, and track peak report counts.
  for (const id of confirmedNow) {
    const open = openEventByRegion.get(id);
    const down = regions[id].down;
    if (!open) {
      const res = stmts.openEvent.run(id, now, down);
      openEventByRegion.set(id, { id: res.lastInsertRowid, peak: down });
    } else if (down > open.peak) {
      stmts.bumpPeak.run(down, open.id, down);
      open.peak = down;
    }
  }
  for (const [regionId, open] of openEventByRegion) {
    if (!confirmedNow.has(regionId)) {
      stmts.closeEvent.run(now, open.id);
      openEventByRegion.delete(regionId);
    }
  }

  return {
    generated_at: now,
    thresholds: {
      confirm: CONFIG.CONFIRM_THRESHOLD,
      suspect: CONFIG.SUSPECT_THRESHOLD,
      working: CONFIG.WORKING_MIN,
      ttl_min: CONFIG.REPORT_TTL_MIN,
    },
    totals: { confirmed, suspected, working: workingCount, reports: totalReports },
    regions,
  };
}

// Cache /api/status for 10s so heavy traffic never hammers SQLite.
let statusCache = { at: 0, body: null };
function getStatus() {
  const now = Date.now();
  if (!statusCache.body || now - statusCache.at > 10_000) {
    statusCache = { at: now, body: computeStatus() };
  }
  return statusCache.body;
}
// Recompute periodically even without traffic, so events close on time.
setInterval(getStatus, 60_000).unref();

function regionNames(id) {
  const r = REGIONS.get(id);
  if (!r) return { del_fr: id, del_ar: id, gouv_fr: '', gouv_ar: '' };
  return { del_fr: r.del_fr, del_ar: r.del_ar, gouv_fr: r.gouv_fr, gouv_ar: r.gouv_ar };
}

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

// General sliding-window rate limit for /api/* (per IP, in-memory).
const apiHits = new Map(); // ip -> number[] of timestamps
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, arr] of apiHits) {
    const kept = arr.filter((t) => t > cutoff);
    if (kept.length === 0) apiHits.delete(ip);
    else apiHits.set(ip, kept);
  }
}, 30_000).unref();

function apiRateLimit(req, res, next) {
  const now = Date.now();
  const arr = (apiHits.get(req.ip) || []).filter((t) => t > now - 60_000);
  if (arr.length >= CONFIG.API_PER_MINUTE) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  arr.push(now);
  apiHits.set(req.ip, arr);
  next();
}

// Security headers (CSP kept tight: only the CDNs the app actually uses,
// plus Google Analytics endpoints).
function securityHeaders(_req, res, next) {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://cdnjs.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      'font-src https://fonts.gstatic.com',
      "img-src 'self' data: https://*.basemaps.cartocdn.com https://*.google-analytics.com https://*.googletagmanager.com",
      "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  });
  next();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
if (CONFIG.TRUST_PROXY) app.set('trust proxy', true);
app.use(securityHeaders);
app.use(express.json({ limit: '2kb' }));
app.use('/api', apiRateLimit);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', etag: true }));

app.get('/api/status', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(getStatus());
});

app.post('/api/report', (req, res) => {
  const { regionId, type } = req.body || {};
  if (typeof regionId !== 'string' || !REGIONS.has(regionId)) {
    return res.status(400).json({ error: 'unknown_region' });
  }
  if (type !== 'down' && type !== 'restored' && type !== 'working') {
    return res.status(400).json({ error: 'invalid_type' });
  }

  const ip = req.ip || '0.0.0.0';
  const hash = ipHash(ip);
  const now = Date.now();

  const hourAgo = now - 3600 * 1000;
  if (stmts.recentByIp.get(hash, hourAgo).n >= CONFIG.IP_HOURLY_LIMIT) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const cooldownStart = now - CONFIG.REPORT_COOLDOWN_MIN * 60 * 1000;
  if (stmts.recentByIpRegion.get(hash, regionId, type, cooldownStart).n > 0) {
    return res.status(409).json({ error: 'already_reported', cooldown_min: CONFIG.REPORT_COOLDOWN_MIN });
  }

  stmts.insert.run(regionId, type, hash, now);
  statusCache.at = 0; // invalidate cache so the reporter sees their effect soon
  res.json({ ok: true });
});

// History: recent confirmed outage events, most recent first.
app.get('/api/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 300);
  const rows = stmts.history.all(limit).map((e) => ({
    ...regionNames(e.region_id),
    region_id: e.region_id,
    started_at: e.started_at,
    ended_at: e.ended_at,
    duration_min: e.ended_at ? Math.round((e.ended_at - e.started_at) / 60000) : null,
    peak_reports: e.peak_reports,
  }));
  res.set('Cache-Control', 'no-store');
  res.json({ events: rows });
});

// Statistics: daily report volume, most affected zones, per-governorate totals.
let statsCache = { at: 0, body: null };
app.get('/api/stats', (_req, res) => {
  const now = Date.now();
  if (!statsCache.body || now - statsCache.at > 60_000) {
    const d14 = now - 14 * 24 * 3600 * 1000;
    const d7 = now - 7 * 24 * 3600 * 1000;
    const d30 = now - 30 * 24 * 3600 * 1000;

    const byGov = new Map();
    for (const r of stmts.govBreakdown.all(d30)) {
      const g = REGIONS.get(r.region_id);
      if (!g) continue;
      const cur = byGov.get(g.gouv_id) || { gouv_fr: g.gouv_fr, gouv_ar: g.gouv_ar, events: 0 };
      cur.events += r.n;
      byGov.set(g.gouv_id, cur);
    }

    const ev = stmts.eventStats.get(d30);
    statsCache = {
      at: now,
      body: {
        generated_at: now,
        daily_reports_14d: stmts.dailyReports.all(d14),
        top_regions_7d: stmts.topRegions.all(d7).map((r) => ({ ...regionNames(r.region_id), region_id: r.region_id, reports: r.n })),
        governorates_30d: [...byGov.values()].sort((a, b) => b.events - a.events),
        events_30d: {
          total: ev.total || 0,
          ongoing: ev.ongoing || 0,
          avg_duration_min: ev.avg_ms ? Math.round(ev.avg_ms / 60000) : null,
        },
      },
    };
  }
  res.set('Cache-Control', 'no-store');
  res.json(statsCache.body);
});

app.listen(CONFIG.PORT, () => {
  console.log(`STEG Status listening on :${CONFIG.PORT}`);
  console.log(`Confirm threshold: ${CONFIG.CONFIRM_THRESHOLD} reports / ${CONFIG.REPORT_TTL_MIN} min`);
});
