const { db }                    = require('../_lib/supabase-admin');
const { sendVerificationEmail } = require('../_lib/mailer');
const bcrypt                    = require('bcryptjs');
const crypto                    = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, realName, password } = req.body || {};

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome de guerreiro, e-mail e senha são obrigatórios.' });

  const trimmedName  = name.trim().slice(0, 20);
  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedName.length < 2)
    return res.status(400).json({ error: 'Nome de guerreiro deve ter ao menos 2 caracteres.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
    return res.status(400).json({ error: 'E-mail inválido.' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres.' });

  try {
    const passwordHash      = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExp   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await db.from('players').insert({
      name:               trimmedName,
      email:              trimmedEmail,
      real_name:          realName?.trim() || null,
      password_hash:      passwordHash,
      email_verified:     false,
      verification_token: verificationToken,
      verification_exp:   verificationExp,
    });

    if (error) {
      if (error.code === '23505') {
        const isEmail = error.message?.includes('email') || error.details?.includes('(email)');
        return res.status(409).json({
          error: isEmail ? 'E-mail já cadastrado.' : 'Nome de guerreiro já cadastrado. Escolha outro.',
        });
      }
      console.error('register error:', error.message);
      return res.status(500).json({ error: 'Erro interno.' });
    }

    await sendVerificationEmail(trimmedEmail, verificationToken).catch(console.error);

    res.json({ registered: true, name: trimmedName, email: trimmedEmail });
  } catch (err) {
    console.error('register error:', err?.message);
    res.status(500).json({ error: 'Erro interno.' });
  }
};
