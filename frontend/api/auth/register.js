const { q }      = require('../_lib/db');
const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, password } = req.body || {};
  if (!name || !password)
    return res.status(400).json({ error: 'Nome e senha são obrigatórios.' });

  const trimmed = name.trim().slice(0, 20);
  if (trimmed.length < 2)
    return res.status(400).json({ error: 'Nome deve ter ao menos 2 caracteres.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres.' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [player] = await q(
      `INSERT INTO medusa.players(name, password_hash)
       VALUES($1, $2)
       RETURNING name, wins, losses, points`,
      [trimmed, passwordHash],
    );
    const token = crypto.randomBytes(32).toString('hex');
    await q('INSERT INTO medusa.sessions(token, player_name) VALUES($1, $2)', [token, trimmed]);
    res.json({ token, player });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Nome já cadastrado. Escolha outro.' });
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
