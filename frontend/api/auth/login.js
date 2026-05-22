const { q }  = require('../_lib/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, password } = req.body || {};
  if (!name || !password)
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });

  try {
    const [player] = await q(
      'SELECT name, password_hash, wins, losses, points FROM medusa.players WHERE name = $1',
      [name.trim()],
    );
    if (!player)
      return res.status(401).json({ error: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(password, player.password_hash);
    if (!ok)
      return res.status(401).json({ error: 'Senha incorreta.' });

    const token = crypto.randomBytes(32).toString('hex');
    await q('INSERT INTO medusa.sessions(token, player_name) VALUES($1, $2)', [token, player.name]);

    const { password_hash: _, ...safePlayer } = player;
    res.json({ token, player: safePlayer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
