import React, { useState } from 'react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface Props {
  onAuth:       (token: string, name: string, needsVerification?: boolean) => void;
  verifiedMsg?: string;
}

type Tab = 'login' | 'register' | 'forgot';

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

export default function AuthScreen({ onAuth, verifiedMsg }: Props) {
  const [tab,         setTab]         = useState<Tab>('login');
  const [name,        setName]        = useState('');
  const [realName,    setRealName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPass]        = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forgotEmail,    setForgotEmail]    = useState('');
  const [forgotSent,     setForgotSent]     = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');  // set after registration → shows pending screen
  const [resendSent,     setResendSent]     = useState(false);
  const [resendLoading,  setResendLoading]  = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [showPrivacy,    setShowPrivacy]    = useState(false);

  const reset = (nextTab: Tab) => {
    setTab(nextTab);
    setError('');
    setPass('');
    setConfirm('');
    setEmail('');
    setRealName('');
    setShowPw(false);
    setShowConfirm(false);
    setForgotEmail('');
    setForgotSent(false);
    setRegisteredEmail('');
    setResendSent(false);
    setPrivacyConsent(false);
  };

  const resendVerification = async () => {
    setResendLoading(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: registeredEmail }),
      });
      setResendSent(true);
    } catch { /* ignore */ }
    finally { setResendLoading(false); }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch('/api/auth/password-reset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } catch {
      setError('Servidor indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'register') {
      if (password !== confirm) { setError('As senhas não coincidem.'); return; }
      if (password.length < 8)  { setError('Senha deve ter ao menos 8 caracteres.'); return; }
    }

    setLoading(true);
    try {
      const path = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = tab === 'login'
        ? { name: name.trim(), password }
        : { name: name.trim(), email: email.trim(), realName: realName.trim(), password };

      const res  = await fetch(path, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro desconhecido.');
      } else if (tab === 'register') {
        // Registration: don't log in — show "check your email" screen
        setRegisteredEmail(data.email || email.trim());
      } else {
        // Login: authenticate
        localStorage.setItem('medusa_token', data.token);
        localStorage.setItem('medusa_name',  data.player.name);
        onAuth(data.token, data.player.name, false);
      }
    } catch {
      setError('Servidor indisponível. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const minPwLen = 8;
  const canSubmit = name.trim().length >= 2 && password.length >= minPwLen &&
    (tab === 'login' || (email.includes('@') && confirm === password && privacyConsent));

  const pwToggleStyle: React.CSSProperties = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#8060a0', padding: 4, lineHeight: 0, display: 'flex', alignItems: 'center',
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-hero">
          <img src="/images/logo.png" alt="Gaze of Medusa" className="auth-logo" />
          <p className="home-subtitle">Batalha Mitológica · PvP Online</p>
        </div>

        {verifiedMsg && (
          <p style={{ color: '#50c050', background: 'rgba(80,192,80,.1)', border: '1px solid rgba(80,192,80,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, textAlign: 'center', marginBottom: 4, width: '100%' }}>
            ✓ {verifiedMsg}
          </p>
        )}

        {/* ── Post-registration: verify email screen (not logged in) ── */}
        {registeredEmail && (
          <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(80,192,80,.08)', border: '1px solid rgba(80,192,80,.2)', borderRadius: 10, padding: '16px 14px' }}>
              <p style={{ color: '#50c050', fontWeight: 600, marginBottom: 6 }}>✓ Conta criada!</p>
              <p style={{ color: '#b89060', fontSize: 13, lineHeight: 1.6 }}>
                Enviamos um link de confirmação para<br />
                <strong style={{ color: '#d4af37' }}>{registeredEmail}</strong>.<br />
                Clique no link para ativar sua conta e depois faça login.
              </p>
            </div>
            {resendSent
              ? <p style={{ color: '#50c050', fontSize: 13 }}>✓ Novo e-mail enviado!</p>
              : <button className="btn-secondary" type="button"
                  onClick={resendVerification} disabled={resendLoading}>
                  {resendLoading ? '⌛ Enviando…' : '📨 Reenviar e-mail de confirmação'}
                </button>
            }
            <button className="auth-link" type="button" onClick={() => reset('login')} style={{ fontSize: 14 }}>
              ← Ir para o login
            </button>
          </div>
        )}

        <div className="auth-tabs" style={{ display: registeredEmail ? 'none' : undefined }}>
          <button className={`auth-tab ${tab === 'login'    ? 'active' : ''}`} onClick={() => reset('login')}    type="button">Entrar</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => reset('register')} type="button">Criar Conta</button>
        </div>

        {/* ── Forgot password view ── */}
        {!registeredEmail && tab === 'forgot' && (
          <div style={{ width: '100%' }}>
            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ color: '#50c050', fontSize: 15, marginBottom: 8 }}>✓ E-mail enviado!</p>
                <p style={{ color: '#b89060', fontSize: 13, lineHeight: 1.6 }}>
                  Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha em breve.
                </p>
                <button className="auth-link" onClick={() => reset('login')} type="button"
                  style={{ marginTop: 16, fontSize: 14 }}>
                  ← Voltar ao login
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={submitForgot}>
                <p style={{ color: '#b89060', fontSize: 13, lineHeight: 1.6, textAlign: 'center' }}>
                  Digite o e-mail cadastrado e enviaremos um link para redefinir sua senha.
                </p>
                <div className="auth-field">
                  <label className="auth-label">E-mail</label>
                  <input className="join-input" type="email" value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="seu@email.com" autoComplete="email" autoFocus required />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="btn-primary" type="submit"
                  disabled={loading || !forgotEmail.includes('@')}>
                  {loading ? '⌛ Enviando…' : '📨 Enviar link de redefinição'}
                </button>
                <button className="auth-link" onClick={() => reset('login')} type="button"
                  style={{ textAlign: 'center', fontSize: 13 }}>
                  ← Voltar ao login
                </button>
              </form>
            )}
          </div>
        )}

        <form className="auth-form" onSubmit={submit} style={{ display: (tab === 'forgot' || registeredEmail) ? 'none' : undefined }}>
          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Nome completo <span className="auth-optional">(opcional)</span></label>
              <input className="join-input" type="text" value={realName} onChange={e => setRealName(e.target.value)}
                placeholder="Seu nome real" maxLength={60} autoComplete="name" />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Nome de guerreiro</label>
            <input className="join-input" type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Perseus, Atalanta…" maxLength={20} autoComplete="username" autoFocus required />
          </div>

          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label">E-mail</label>
              <input className="join-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" autoComplete="email" required />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input className="join-input" type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPass(e.target.value)}
                placeholder={`Mínimo ${minPwLen} caracteres`} minLength={minPwLen}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 44 }} required />
              <button type="button" style={pwToggleStyle} onClick={() => setShowPw(v => !v)}
                tabIndex={-1} aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {tab === 'login' && (
            <div style={{ textAlign: 'right' }}>
              <button type="button" className="auth-link"
                style={{ fontSize: 12 }}
                onClick={() => reset('forgot')}>
                Esqueci minha senha
              </button>
            </div>
          )}

          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input className="join-input" type={showConfirm ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha" autoComplete="new-password"
                  style={{ paddingRight: 44 }} required />
                <button type="button" style={pwToggleStyle} onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1} aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>
          )}

          {tab === 'register' && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: 'pointer', fontSize: 12, color: '#8060a0', lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={e => setPrivacyConsent(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#8b0000', flexShrink: 0 }}
                required
              />
              <span>
                Li e concordo com a{' '}
                <button
                  type="button"
                  className="auth-link"
                  style={{ fontSize: 12, display: 'inline', padding: 0 }}
                  onClick={() => setShowPrivacy(true)}
                >
                  Política de Privacidade
                </button>
                {' '}e autorizo o tratamento dos meus dados para uso do jogo.
              </span>
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={loading || !canSubmit}>
            {loading ? '⌛ Aguarde…' : tab === 'login' ? '⚔️ Entrar na Arena' : '🐍 Criar Conta'}
          </button>
        </form>

        {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}

        {!registeredEmail && tab !== 'forgot' && (
          <p className="auth-switch">
            {tab === 'login'
              ? (<>Novo por aqui?{' '}<button className="auth-link" onClick={() => reset('register')} type="button">Criar conta</button></>)
              : (<>Já tem conta?{' '}<button className="auth-link" onClick={() => reset('login')}    type="button">Entrar</button></>)
            }
          </p>
        )}
      </div>
    </div>
  );
}
