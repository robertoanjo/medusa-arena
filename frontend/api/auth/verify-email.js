const { db } = require('../_lib/supabase-admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token obrigatório.' });

  try {
    const { data: player } = await db
      .from('players')
      .select('name, verification_exp, email_verified')
      .eq('verification_token', token)
      .single();

    if (!player) return res.status(400).json({ error: 'Token inválido ou expirado.' });
    if (player.email_verified) return res.json({ ok: true, alreadyVerified: true });
    if (new Date(player.verification_exp) < new Date())
      return res.status(400).json({ error: 'Token expirado. Solicite um novo e-mail de verificação.' });

    await db
      .from('players')
      .update({ email_verified: true, verification_token: null, verification_exp: null })
      .eq('name', player.name);

    res.json({ ok: true });
  } catch (err) {
    console.error('verify-email error:', err?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
