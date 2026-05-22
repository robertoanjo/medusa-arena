const { q }           = require('./_lib/db');
const { resolveToken } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const rows = await q(
    `SELECT name, wins, losses, points
     FROM medusa.players
     ORDER BY points DESC, wins DESC
     LIMIT 20`,
  );
  res.json(rows);
};
