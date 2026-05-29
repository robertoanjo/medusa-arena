import React, { useState } from 'react';

interface Props {
  playerName: string;
  token:      string;
  onContinue: () => void;
  onLogout:   () => void;
}

export default function VerifyEmailScreen({ playerName, token, onContinue, onLogout }: Props) {
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState('');

  const resend = async () => {
    setSending(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/verify-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Erro ao reenviar.');
      else setSent(true);
    } catch {
      setError('Servidor indisponível.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <img src="/images/logo.png" alt="Gaze of Medusa" className="auth-logo" />
        <h2 style={{ color: '#d4af37', margin: '16px 0 8px' }}>Confirme seu e-mail</h2>
        <p style={{ color: '#b89060', marginBottom: 8 }}>
          Olá, <strong>{playerName}</strong>!
        </p>
        <p style={{ color: '#c8a870', marginBottom: 24, lineHeight: 1.6 }}>
          Enviamos um link de confirmação para o seu e-mail.<br />
          Clique nele para ativar sua conta e entrar na arena.
        </p>

        {error && <p className="auth-error">{error}</p>}
        {sent  && <p style={{ color: '#50c050', marginBottom: 12 }}>✓ Novo e-mail enviado! Verifique sua caixa de entrada.</p>}

        <button className="btn-primary" onClick={resend} disabled={sending || sent}
          style={{ marginBottom: 12, width: '100%' }}>
          {sending ? '⌛ Enviando…' : sent ? '✓ E-mail enviado' : '📨 Reenviar e-mail de confirmação'}
        </button>

        <button className="auth-link" onClick={onLogout} style={{ fontSize: 13 }}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
