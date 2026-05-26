const { db }           = require('../_lib/supabase-admin');
const { resolveToken } = require('../_lib/auth');
const bcrypt           = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'Nova senha deve ter ao menos 8 caracteres.' });

  const { data: full } = await db
    .from('players')
    .select('password_hash')
    .eq('name', player.name)
    .single();

  const ok = await bcrypt.compare(currentPassword, full.password_hash);
  if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.from('players').update({ password_hash: newHash }).eq('name', player.name);

  // Invalidate all existing sessions so any stolen token stops working
  await db.from('sessions').delete().eq('player_name', player.name);

  res.json({ ok: true });
};
