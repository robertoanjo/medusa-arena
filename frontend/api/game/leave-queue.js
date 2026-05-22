const { q }            = require('../_lib/db');
const { resolveToken } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  await q('DELETE FROM medusa.queue WHERE player_name = $1', [player.name]);
  res.json({ ok: true });
};
