/**
 * Rate limiting via Upstash Redis.
 *
 * Requires env vars:
 *   UPSTASH_REDIS_REST_URL   — from upstash.com console
 *   UPSTASH_REDIS_REST_TOKEN — from upstash.com console
 *
 * Fails OPEN (allows the request) when:
 *   - env vars are not set (local dev / Redis not configured yet)
 *   - Redis call throws (infra hiccup)
 *
 * Usage:
 *   const { rateLimit } = require('../_lib/ratelimit');
 *   if (!(await rateLimit(req, res, 'login'))) return;
 */

let _limiters = null;

const CONFIGS = {
  // Brute-force protection: 10 attempts per 15 minutes per IP
  login:    { window: '15 m', max: 10 },
  // Spam/account-creation protection: 5 per hour per IP
  register: { window: '1 h',  max: 5  },
  // Email-flood protection: 5 per hour per IP
  email:    { window: '1 h',  max: 5  },
};

function buildLimiters() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Require lazily so the module doesn't crash when packages are absent
  const { Redis }     = require('@upstash/redis');
  const { Ratelimit } = require('@upstash/ratelimit');

  const redis = new Redis({ url, token });

  const out = {};
  for (const [key, { window, max }] of Object.entries(CONFIGS)) {
    out[key] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix:  `rl:${key}`,
    });
  }
  return out;
}

function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket?.remoteAddress) || 'unknown';
}

/**
 * @param {object} req
 * @param {object} res
 * @param {'login'|'register'|'email'} key
 * @returns {Promise<boolean>} true = allowed, false = blocked (response already sent)
 */
async function rateLimit(req, res, key) {
  if (!_limiters) _limiters = buildLimiters();
  if (!_limiters) return true; // no Redis configured — fail open

  const limiter = _limiters[key];
  if (!limiter) return true;

  const ip = getIP(req);

  try {
    const { success, limit, remaining, reset } = await limiter.limit(ip);

    res.setHeader('X-RateLimit-Limit',     String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset',     String(reset));

    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[ratelimit] Redis error, failing open:', err?.message);
    return true; // fail open on infra errors
  }
}

module.exports = { rateLimit };
