const { db }                    = require('../_lib/supabase-admin');
const { resolveToken }          = require('../_lib/auth');
const { sendVerificationEmail } = require('../_lib/mailer');
const { rateLimit }             = require('../_lib/ratelimit');
const crypto                    = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Verificar token ────────────────────────────────────────────────────────
  // POST { token } → verifica e-mail com o token de verificação
  if (req.body?.token) {
    const { token } = req.body;
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

      return res.json({ ok: true });
    } catch (err) {
      console.error('verify-email error:', err?.message);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  }

  // ── Reenviar e-mail de verificação ─────────────────────────────────────────
  // POST {} (autenticado) ou POST { email } → reenvia link de verificação
  if (!(await rateLimit(req, res, 'email'))) return;

  try {
    let playerEmail = null;

    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    const player      = bearerToken ? await resolveToken(bearerToken) : null;

    if (player) {
      const { data: row } = await db
        .from('players')
        .select('email, email_verified')
        .eq('name', player.name)
        .single();

      if (!row?.email) return res.status(400).json({ error: 'Nenhum e-mail cadastrado.' });
      if (row.email_verified) return res.json({ ok: true, alreadyVerified: true });
      playerEmail = row.email;
    } else if (req.body?.email) {
      const { data: row } = await db
        .from('players')
        .select('email, email_verified')
        .eq('email', req.body.email.trim().toLowerCase())
        .single();

      if (!row?.email) return res.json({ ok: true }); // silent
      if (row.email_verified) return res.json({ ok: true, alreadyVerified: true });
      playerEmail = row.email;
    } else {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExp   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await db
      .from('players')
      .update({ verification_token: newToken, verification_exp: newExp })
      .eq('email', playerEmail);

    await sendVerificationEmail(playerEmail, newToken).catch(console.error);

    return res.json({ ok: true });
  } catch (err) {
    console.error('resend-verification error:', err?.message);
    return res.status(500).json({ error: 'Erro interno.' });
  }
};
