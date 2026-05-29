const { db }           = require('./_lib/supabase-admin');
const { resolveToken } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { data } = await db
    .from('players')
    .select('name, wins, losses, points')
    .order('points', { ascending: false })
    .order('wins', { ascending: false })
    .limit(20);

  res.json(data || []);
};
