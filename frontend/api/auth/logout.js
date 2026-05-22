const { q } = require('../_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await q('DELETE FROM medusa.sessions WHERE token = $1', [token]).catch(() => {});
  }
  res.json({ ok: true });
};
