const { db }                     = require('../_lib/supabase-admin');
const { sendPasswordResetEmail } = require('../_lib/mailer');
const bcrypt                     = require('bcryptjs');
const crypto                     = require('crypto');

module.exports = async function handler(req, res) {

  // ── GET → diagnóstico: tabelas acessíveis via HTTP API ───────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db.from('password_resets').select('id').limit(1);
    return res.json({ password_resets_accessible: !error, error: error?.message });
  }

  // ── POST { email } → solicitar reset ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    // Always respond OK to avoid revealing whether email exists
    try {
      const { data: player } = await db
        .from('players')
        .select('name, email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (player?.email) {
        const token     = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        // Clean up old unused tokens for this player
        await db
          .from('password_resets')
          .delete()
          .eq('player_name', player.name)
          .eq('used', false);

        const { error: insertErr } = await db
          .from('password_resets')
          .insert({ player_name: player.name, token, expires_at: expiresAt });

        if (insertErr) {
          console.error('password-reset insert error:', insertErr.message, insertErr.code);
        } else {
          await sendPasswordResetEmail(player.email, token).catch(console.error);
        }
      }
    } catch (err) {
      console.error('password-reset POST error:', err?.message, err?.code);
    }

    return res.json({ ok: true });
  }

  // ── PUT { token, newPassword } → aplicar reset ───────────────────────────────
  if (req.method === 'PUT') {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword)
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres.' });

    try {
      const { data: reset } = await db
        .from('password_resets')
        .select('player_name, expires_at, used')
        .eq('token', token)
        .single();

      if (!reset)
        return res.status(400).json({ error: 'Link inválido. Solicite um novo.' });
      if (reset.used)
        return res.status(400).json({ error: 'Este link já foi utilizado. Solicite um novo.' });
      if (new Date(reset.expires_at) < new Date())
        return res.status(400).json({ error: 'Link expirado. Solicite um novo.' });

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await db
        .from('players')
        .update({ password_hash: passwordHash })
        .eq('name', reset.player_name);

      await db
        .from('password_resets')
        .update({ used: true })
        .eq('token', token);

      // Invalidate all sessions for security
      await db
        .from('sessions')
        .delete()
        .eq('player_name', reset.player_name);

      return res.json({ ok: true });
    } catch (err) {
      console.error('password-reset PUT error:', err?.message);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  }

  return res.status(405).end();
};
