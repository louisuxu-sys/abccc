import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { renderDashboard, renderPage } from './views.mjs';
import { emptyRules, parseRules, platforms, ruleResult } from './rules.mjs';

const host = process.env.HOST || '127.0.0.1';
const password = process.env.ADMIN_PASSWORD;
const localAdmin = !password && host === '127.0.0.1' && process.env.COOKIE_SECURE !== '1' && !process.env.PUBLIC_ORIGIN;
if (!localAdmin && (!password || password.length < 16)) throw new Error('請設定至少 16 個字元的 ADMIN_PASSWORD。');
const hash = value => createHash('sha256').update(value).digest();
const adminDigest = hash(`admin:${password}`);
const csrf = randomBytes(32).toString('hex');
const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
const db = new DatabaseSync(process.env.DB_PATH || 'traffic.sqlite');
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS campaigns (
    slug TEXT PRIMARY KEY, title TEXT NOT NULL, mode TEXT NOT NULL,
    a TEXT NOT NULL, b TEXT NOT NULL, weight INTEGER NOT NULL,
    enabled INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS counts (
    slug TEXT NOT NULL, variant TEXT NOT NULL, source TEXT NOT NULL, visits INTEGER NOT NULL,
    PRIMARY KEY (slug, variant, source)
  );
`);
db.exec('BEGIN IMMEDIATE');
try {
  const existingColumns = new Set(db.prepare('PRAGMA table_info(campaigns)').all().map(row => row.name));
  if (!existingColumns.has('platform')) db.exec("ALTER TABLE campaigns ADD COLUMN platform TEXT NOT NULL DEFAULT '其他'");
  if (!existingColumns.has('created_at')) db.exec('ALTER TABLE campaigns ADD COLUMN created_at TEXT');
  if (!existingColumns.has('rules')) db.exec("ALTER TABLE campaigns ADD COLUMN rules TEXT NOT NULL DEFAULT '{}'");
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
const findCampaign = db.prepare('SELECT * FROM campaigns WHERE slug = ?');
const saveCampaign = db.prepare(`INSERT INTO campaigns (slug,title,mode,a,b,weight,enabled,platform,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO UPDATE SET title=excluded.title, mode=excluded.mode,
  a=excluded.a, b=excluded.b, weight=excluded.weight, enabled=excluded.enabled, platform=excluded.platform`);
const countVisit = db.prepare(`INSERT INTO counts VALUES (?, ?, ?, 1)
  ON CONFLICT(slug, variant, source) DO UPDATE SET visits=visits+1`);
const listCampaigns = db.prepare('SELECT * FROM campaigns ORDER BY slug');
const listCounts = db.prepare(`SELECT slug, variant, sum(visits) AS visits FROM counts GROUP BY slug, variant`);
const listSources = db.prepare(`SELECT source, sum(visits) AS visits FROM counts WHERE slug=? GROUP BY source ORDER BY visits DESC LIMIT 10`);
const attribution = /^(utm_[a-z0-9_]{1,60}|gclid|gbraid|wbraid|fbclid|msclkid)$/i;

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

async function readForm(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return null;
  let body = '';
  req.setEncoding('utf8');
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20000) return null;
  }
  return new URLSearchParams(body);
}

function isDestination(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function showDashboard(res, url, status = 200, message = '', draft) {
  const page = ['edit', 'rules', 'delete', 'link', 'new', 'overview'].find(key => url.searchParams.has(key)) || '';
  const selected = url.searchParams.get(page);
  const current = selected ? findCampaign.get(selected) : undefined;
  const campaigns = listCampaigns.all();
  const counts = listCounts.all();
  const sources = current ? listSources.all(current.slug) : [];
  const link = current ? new URL(`/r/${current.slug}`, process.env.PUBLIC_ORIGIN || url.origin).href : '';
  send(res, status, renderDashboard({ campaigns, counts, sources, current, draft, csrf, message, page, link }));
}

async function handleAdmin(req, res, url) {
  if (localAdmin && (req.socket.remoteAddress !== '127.0.0.1' || url.hostname !== host ||
      !/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host || '') || req.headers['sec-fetch-site'] === 'cross-site')) {
    return send(res, 403, '請直接從本機的 127.0.0.1 開啟後台。');
  }
  const authorization = req.headers.authorization || '';
  const credentials = authorization.startsWith('Basic ')
    ? Buffer.from(authorization.slice(6), 'base64').toString('utf8') : '';
  if (!localAdmin && !timingSafeEqual(hash(credentials), adminDigest)) {
    return send(res, 401, renderPage('請登入', '<p>請使用管理員帳號 admin 登入。</p>'), {
      'WWW-Authenticate': 'Basic realm="Traffic Router", charset="UTF-8"',
    });
  }
  if (req.method === 'GET') return showDashboard(res, url, 200, url.searchParams.has('saved') ? '變更已儲存。' : '');
  if (req.method !== 'POST') return send(res, 405, 'Method not allowed', { Allow: 'GET, POST' });
  const form = await readForm(req);
  if (!form || form.get('csrf') !== csrf) return send(res, 403, '表單已失效，請重新整理。');
  const field = key => (form.get(key) || '').trim();
  const action = field('action');
  const original = field('original');
  if (action === 'rules' || action === 'delete') {
    if (!findCampaign.get(original)) return showDashboard(res, url, 404, '找不到路由。');
    if (action === 'rules') {
      const rules = parseRules(form);
      if (!rules) return showDashboard(res, url, 400, '請檢查國家代碼、ASN 和起訖時間。', Object.fromEntries(form));
      db.prepare('UPDATE campaigns SET rules=? WHERE slug=?').run(JSON.stringify(rules), original);
    } else {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM counts WHERE slug=?').run(original);
        db.prepare('DELETE FROM campaigns WHERE slug=?').run(original);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    return res.writeHead(303, { Location: '/admin?saved=1' }).end();
  }
  const slug = field('slug') || (!original ? randomBytes(8).toString('hex') : '');
  const platform = field('platform') || '其他';
  const title = field('title');
  const mode = field('mode');
  const a = field('a');
  const b = field('b');
  const rawWeight = field('weight');
  const weight = Number(rawWeight);
  const enabled = ['1', 'on'].includes(field('enabled')) ? 1 : 0;
  const draft = { slug, title, mode, a, b, weight: rawWeight, enabled, platform };
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(slug) || !title || title.length > 100 ||
      !platforms.includes(platform) || !['redirect', 'inline'].includes(mode) || !/^\d{1,3}$/.test(rawWeight) || weight > 100 ||
      !a || !b || a.length > 2000 || b.length > 2000 ||
      (mode === 'redirect' && (!isDestination(a) || !isDestination(b)))) {
    return showDashboard(res, url, 400, '請檢查活動代號、A 比例與兩個版本。跳轉模式需要完整的 HTTP 或 HTTPS 網址。', draft);
  }
  if (original ? original !== slug || !findCampaign.get(original) : findCampaign.get(slug)) {
    return showDashboard(res, url, 409, '活動代號已使用，或編輯的活動已不存在。', draft);
  }
  saveCampaign.run(slug, title, mode, a, b, weight, enabled, platform, new Date().toISOString());
  res.writeHead(303, { Location: '/admin?saved=1' }).end();
}

function handleVisit(req, res, url, slug) {
  const campaign = findCampaign.get(slug);
  if (!campaign || !campaign.enabled) return send(res, 404, renderPage('活動未開放', '<p>請確認連結或稍後再試。</p>'));
  const cookieName = `ab_${slug}`;
  const cookie = (req.headers.cookie || '').split(';').map(entry => entry.trim())
    .find(entry => entry.startsWith(`${cookieName}=`));
  let bucket = cookie ? Number(cookie.slice(cookieName.length + 1)) : NaN;
  if (!Number.isInteger(bucket) || bucket < 0 || bucket > 99) {
    bucket = randomInt(100);
    res.setHeader('Set-Cookie', `${cookieName}=${bucket}; Path=/r/${slug}; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`);
  }
  const rules = { ...emptyRules, ...JSON.parse(campaign.rules) };
  const variant = ruleResult(rules, req.headers) || bucket < campaign.weight ? 'A' : 'B';
  const content = variant === 'A' ? campaign.a : campaign.b;
  const source = (url.searchParams.get('utm_source') || '').trim().slice(0, 80) || '（未標記）';
  countVisit.run(slug, variant, source);
  if (campaign.mode === 'inline') return send(res, 200, renderPage(campaign.title, content, true));
  const target = new URL(content);
  for (const [key, value] of url.searchParams) {
    if (attribution.test(key) && value.length <= 512) target.searchParams.set(key, value);
  }
  res.writeHead(302, { Location: target.toString() }).end();
}

export async function handleRequest(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  try {
    const origin = `${secure ? 'https' : 'http'}://${req.headers.host || '127.0.0.1:8787'}`;
    const url = new URL(req.url, origin);
    if (url.pathname === '/admin') return await handleAdmin(req, res, url);
    if (req.method !== 'GET') return send(res, 405, 'Method not allowed', { Allow: 'GET' });
    if (url.pathname === '/') return res.writeHead(302, { Location: '/admin' }).end();
    const match = /^\/r\/([a-z0-9][a-z0-9-]{0,47})$/.exec(url.pathname);
    if (match) return handleVisit(req, res, url, match[1]);
    return send(res, 404, renderPage('找不到頁面', '<p>請確認網址。</p>'));
  } catch (error) {
    console.error(error.message);
    if (res.headersSent) return res.end();
    return send(res, 500, renderPage('暫時無法處理', '<p>請稍後再試。</p>'));
  }
}

if (import.meta.main) {
  const server = createServer(handleRequest);
  server.listen(Number(process.env.PORT || 8787), host, () => {
    console.log(`http://${host}:${server.address().port}/admin`);
  });
}
