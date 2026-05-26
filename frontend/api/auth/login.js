const { db }        = require('../_lib/supabase-admin');
const { rateLimit } = require('../_lib/ratelimit');
const bcrypt        = require('bcryptjs');
const crypto        = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await rateLimit(req, res, 'login'))) return;

  const { name, password } = req.body || {};
  if (!name || !password)
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });

  try {
    const { data: player } = await db
      .from('players')
      .select('name, password_hash, wins, losses, points')
      .eq('name', name.trim())
      .single();

    if (!player) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const ok = await bcrypt.compare(password, player.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

    const token = crypto.randomBytes(32).toString('hex');
    await db.from('sessions').insert({ token, player_name: player.name });

    const { password_hash: _, ...safePlayer } = player;
    res.json({ token, player: safePlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
