const { db }                    = require('../_lib/supabase-admin');
const { resolveToken }          = require('../_lib/auth');
const { sendVerificationEmail } = require('../_lib/mailer');
const crypto                    = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    let playerEmail = null;

    // Authenticated (Bearer token) or unauthenticated (email in body)
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    const player      = bearerToken ? await resolveToken(bearerToken) : null;

    if (player) {
      // Authenticated: find by player name
      const { data: row } = await db
        .from('players')
        .select('email, email_verified')
        .eq('name', player.name)
        .single();

      if (!row?.email) return res.status(400).json({ error: 'Nenhum e-mail cadastrado.' });
      if (row.email_verified) return res.json({ ok: true, alreadyVerified: true });
      playerEmail = row.email;
    } else if (req.body?.email) {
      // Unauthenticated: find by email
      const { data: row } = await db
        .from('players')
        .select('email, email_verified')
        .eq('email', req.body.email.trim().toLowerCase())
        .single();

      if (!row?.email) return res.json({ ok: true }); // silent — don't reveal
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

    res.json({ ok: true });
  } catch (err) {
    console.error('resend-verification error:', err?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
