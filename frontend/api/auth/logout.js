const { db } = require('../_lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await db.from('sessions').delete().eq('token', token).catch(() => {});
  }
  res.json({ ok: true });
};
