import React, { useState } from 'react';

interface Props {
  token:   string;
  onDone:  (msg: string) => void; // redirect to login with success message
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#8060a0', padding: 4, lineHeight: 0, display: 'flex', alignItems: 'center',
};

export default function ResetPasswordScreen({ token, onDone }: Props) {
  const [newPw,     setNewPw]     = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const canSubmit = newPw.length >= 8 && confirm === newPw;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirm) { setError('As senhas não coincidem.'); return; }
    if (newPw.length < 8)  { setError('Mínimo 8 caracteres.'); return; }
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/password-reset', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir senha.');
      } else {
        onDone('Senha redefinida com sucesso! Faça login para entrar na arena.');
      }
    } catch {
      setError('Servidor indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-hero">
          <img src="/images/logo.png" alt="Gaze of Medusa" className="auth-logo" />
          <p className="home-subtitle">Redefinir Senha</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <p style={{ color: '#b89060', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
            Digite sua nova senha abaixo. O link só pode ser usado uma vez.
          </p>

          <div className="auth-field">
            <label className="auth-label">Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input className="join-input" type={showPw ? 'text' : 'password'}
                value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="Mínimo 8 caracteres" minLength={8}
                autoComplete="new-password" autoFocus
                style={{ paddingRight: 44 }} required />
              <button type="button" style={eyeBtn} tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirmar nova senha</label>
            <div style={{ position: 'relative' }}>
              <input className="join-input" type={showConf ? 'text' : 'password'}
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                style={{ paddingRight: 44 }} required />
              <button type="button" style={eyeBtn} tabIndex={-1}
                onClick={() => setShowConf(v => !v)}
                aria-label={showConf ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon open={showConf} />
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading || !canSubmit}>
            {loading ? '⌛ Salvando…' : '🔑 Definir nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
