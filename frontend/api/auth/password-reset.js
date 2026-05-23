const { q }                    = require('../_lib/db');
const { sendPasswordResetEmail } = require('../_lib/mailer');
const bcrypt                   = require('bcryptjs');
const crypto                   = require('crypto');

module.exports = async function handler(req, res) {

  // ── GET → diagnóstico temporário (tabelas do schema medusa) ──────────────────
  if (req.method === 'GET') {
    try {
      const tables = await q(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'medusa' ORDER BY table_name`
      );
      const cols = await q(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'medusa' AND table_name = 'password_resets' ORDER BY ordinal_position`
      );
      return res.json({ tables: tables.map(r => r.table_name), password_resets_cols: cols.map(r => r.column_name) });
    } catch (err) {
      return res.status(500).json({ error: err.message, code: err.code });
    }
  }

  // ── POST { email } → solicitar reset ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    // Always respond OK to avoid revealing whether email exists
    try {
      const players = await q(
        'SELECT name, email FROM medusa.players WHERE email = $1',
        [email.trim().toLowerCase()]
      );
      const player = players[0];

      if (player?.email) {
        const token     = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Clean up old unused tokens for this player
        await q(
          'DELETE FROM medusa.password_resets WHERE player_name = $1 AND used = FALSE',
          [player.name]
        );

        await q(
          'INSERT INTO medusa.password_resets (player_name, token, expires_at) VALUES ($1, $2, $3)',
          [player.name, token, expiresAt]
        );

        await sendPasswordResetEmail(player.email, token).catch(console.error);
      }
    } catch (err) {
      console.error('password-reset POST error msg:', err?.message);
      console.error('password-reset POST error code:', err?.code);
      console.error('password-reset POST error stack:', err?.stack?.slice(0, 400));
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
      const resets = await q(
        'SELECT player_name, expires_at, used FROM medusa.password_resets WHERE token = $1',
        [token]
      );
      const reset = resets[0];

      if (!reset)
        return res.status(400).json({ error: 'Link inválido. Solicite um novo.' });
      if (reset.used)
        return res.status(400).json({ error: 'Este link já foi utilizado. Solicite um novo.' });
      if (new Date(reset.expires_at) < new Date())
        return res.status(400).json({ error: 'Link expirado. Solicite um novo.' });

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await q(
        'UPDATE medusa.players SET password_hash = $1 WHERE name = $2',
        [passwordHash, reset.player_name]
      );
      await q(
        'UPDATE medusa.password_resets SET used = TRUE WHERE token = $1',
        [token]
      );
      // Invalidate all sessions for security
      await q(
        'DELETE FROM medusa.sessions WHERE player_name = $1',
        [reset.player_name]
      );

      return res.json({ ok: true });
    } catch (err) {
      console.error('password-reset PUT error:', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  }

  return res.status(405).end();
};
