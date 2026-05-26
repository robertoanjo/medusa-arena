const { db }                    = require('../_lib/supabase-admin');
const { resolveToken }          = require('../_lib/auth');
const { sendVerificationEmail } = require('../_lib/mailer');
const crypto                    = require('crypto');

module.exports = async function handler(req, res) {
  const token  = req.headers.authorization?.replace('Bearer ', '');
  const player = await resolveToken(token);
  if (!player) return res.status(401).json({ error: 'Não autenticado.' });

  if (req.method === 'GET') {
    const { data } = await db
      .from('players')
      .select('name, real_name, email, email_verified, wins, losses, points')
      .eq('name', player.name)
      .single();
    return res.json(data || {});
  }

  if (req.method === 'PUT') {
    const { realName, email } = req.body || {};
    const updateObj = {};
    let emailChanged = false;

    if (realName !== undefined) {
      updateObj.real_name = realName.trim() || null;
    }

    if (email !== undefined) {
      const trimmed = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
        return res.status(400).json({ error: 'E-mail inválido.' });

      // Only update if email actually changed
      const { data: cur } = await db
        .from('players')
        .select('email')
        .eq('name', player.name)
        .single();

      if (cur?.email !== trimmed) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExp   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        updateObj.email              = trimmed;
        updateObj.email_verified     = false;
        updateObj.verification_token = verificationToken;
        updateObj.verification_exp   = verificationExp;

        await sendVerificationEmail(trimmed, verificationToken).catch(console.error);
        emailChanged = true;
      }
    }

    if (Object.keys(updateObj).length === 0) return res.json({ ok: true });

    const { error } = await db
      .from('players')
      .update(updateObj)
      .eq('name', player.name);

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'E-mail já em uso.' });
      console.error('profile PUT error:', error.message);
      return res.status(500).json({ error: 'Erro interno.' });
    }

    return res.json({ ok: true, emailChanged });
  }

  if (req.method === 'DELETE') {
    // ── Account deletion (LGPD Art. 18 — direito ao esquecimento) ─────────────
    const name = player.name;
    try {
      // Delete in FK-safe order
      await db.from('sessions').delete().eq('player_name', name);
      await db.from('queue').delete().eq('player_name', name);

      // password_resets may not exist on older installs — ignore errors
      await db.from('password_resets').delete().eq('player_name', name).then(() => {}).catch(() => {});

      // Remove game records that reference this player
      await db.from('games').delete().or(`player_a.eq.${name},player_b.eq.${name}`);

      // Finally delete the player row
      await db.from('players').delete().eq('name', name);

      return res.json({ ok: true });
    } catch (err) {
      console.error('[delete-account] error:', err?.message);
      return res.status(500).json({ error: 'Erro ao excluir conta. Tente novamente.' });
    }
  }

  res.status(405).end();
};
