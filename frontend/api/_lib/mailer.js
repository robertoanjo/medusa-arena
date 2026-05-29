const nodemailer = require('nodemailer');

const FROM = '"Gaze of Medusa" <contactgazeofmedusa@gmail.com>';

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendVerificationEmail(to, token) {
  const transport = getTransport();
  if (!transport) return;

  const url = `${process.env.APP_URL || 'https://medusa-arena.vercel.app'}/?verify=${token}`;
  await transport.sendMail({
    from: FROM,
    to,
    subject: '⚔️ Confirme seu e-mail — Gaze of Medusa',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#1a0a2e;color:#e8d5b7;padding:32px;border-radius:12px">
        <h1 style="color:#d4af37;margin-bottom:8px">Gaze of Medusa</h1>
        <p style="color:#b89060">Batalha Mitológica · PvP Online</p>
        <hr style="border-color:#4a3060;margin:24px 0">
        <p>Olá, guerreiro! Confirme seu e-mail para entrar na Arena:</p>
        <a href="${url}"
           style="display:inline-block;margin:20px 0;padding:14px 28px;background:#8b0000;color:#ffd700;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
          ⚔️ Confirmar E-mail
        </a>
        <p style="font-size:12px;color:#8060a0">Link válido por 24 horas.<br>Se não criou uma conta, ignore este e-mail.</p>
      </div>`,
  });
}

async function sendPasswordResetEmail(to, token) {
  const transport = getTransport();
  if (!transport) return;

  const url = `${process.env.APP_URL || 'https://medusa-arena.vercel.app'}/?reset=${token}`;
  await transport.sendMail({
    from: FROM,
    to,
    subject: '🔑 Redefina sua senha — Gaze of Medusa',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#1a0a2e;color:#e8d5b7;padding:32px;border-radius:12px">
        <h1 style="color:#d4af37;margin-bottom:8px">Gaze of Medusa</h1>
        <p style="color:#b89060">Batalha Mitológica · PvP Online</p>
        <hr style="border-color:#4a3060;margin:24px 0">
        <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
        <a href="${url}"
           style="display:inline-block;margin:20px 0;padding:14px 28px;background:#8b0000;color:#ffd700;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
          🔑 Redefinir Senha
        </a>
        <p style="font-size:12px;color:#8060a0">Link válido por 1 hora.<br>Se não solicitou, ignore este e-mail — sua senha permanece a mesma.</p>
      </div>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
