import React, { useState, useEffect } from 'react';
import type { PlayerProfile } from '../types';
import PrivacyPolicyModal from './PrivacyPolicyModal';

interface Props {
  token:    string;
  onBack:   () => void;
  onLogout: () => void;
}

function authH(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
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

export default function ProfileScreen({ token, onBack, onLogout }: Props) {
  const [profile,     setProfile]     = useState<PlayerProfile | null>(null);
  const [realName,    setRealName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [curPw,       setCurPw]       = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [infoMsg,     setInfoMsg]     = useState('');
  const [infoErr,     setInfoErr]     = useState('');
  const [pwMsg,       setPwMsg]       = useState('');
  const [pwErr,       setPwErr]       = useState('');
  const [savingInfo,  setSavingInfo]  = useState(false);
  const [savingPw,    setSavingPw]    = useState(false);
  const [resending,   setResending]   = useState(false);
  const [resentOk,    setResentOk]    = useState(false);
  const [showCurPw,   setShowCurPw]   = useState(false);
  const [showNewPw,   setShowNewPw]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetSending,   setResetSending]   = useState(false);
  const [resetSent,      setResetSent]      = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteErr,      setDeleteErr]      = useState('');
  const [showPrivacy,    setShowPrivacy]    = useState(false);

  useEffect(() => {
    fetch('/api/user/profile', { headers: authH(token) })
      .then(r => r.json())
      .then(d => { setProfile(d); setRealName(d.real_name || ''); setEmail(d.email || ''); });
  }, [token]);

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg(''); setInfoErr('');
    setSavingInfo(true);
    try {
      const res  = await fetch('/api/user/profile', {
        method:  'PUT',
        headers: authH(token),
        body:    JSON.stringify({ realName, email }),
      });
      const data = await res.json();
      if (!res.ok) { setInfoErr(data.error || 'Erro.'); }
      else {
        setInfoMsg(data.emailChanged ? 'Dados salvos. Confirme o novo e-mail.' : 'Dados atualizados!');
        setProfile(p => p ? { ...p, real_name: realName || null, email } : p);
      }
    } catch { setInfoErr('Servidor indisponível.'); }
    finally  { setSavingInfo(false); }
  };

  const savePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (newPw !== confirmPw) { setPwErr('As senhas não coincidem.'); return; }
    if (newPw.length < 8)    { setPwErr('Mínimo 8 caracteres.'); return; }
    setSavingPw(true);
    try {
      const res  = await fetch('/api/auth/change-password', {
        method:  'POST',
        headers: authH(token),
        body:    JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwErr(data.error || 'Erro.'); }
      else {
        setPwMsg('Senha alterada com sucesso!');
        setCurPw(''); setNewPw(''); setConfirmPw('');
        setShowCurPw(false); setShowNewPw(false); setShowConfirm(false);
      }
    } catch { setPwErr('Servidor indisponível.'); }
    finally  { setSavingPw(false); }
  };

  const sendPasswordReset = async () => {
    if (!profile?.email) { setPwErr('Nenhum e-mail cadastrado.'); return; }
    setResetSending(true);
    try {
      await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      });
      setResetSent(true);
    } catch { /* ignore */ }
    finally { setResetSending(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteErr('');
    try {
      const res  = await fetch('/api/user/profile', { method: 'DELETE', headers: authH(token) });
      const data = await res.json();
      if (!res.ok) { setDeleteErr(data.error || 'Erro ao excluir conta.'); return; }
      // Clear local storage and log out
      localStorage.removeItem('medusa_token');
      localStorage.removeItem('medusa_name');
      onLogout();
    } catch { setDeleteErr('Servidor indisponível. Tente novamente.'); }
    finally   { setDeleting(false); }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST', headers: authH(token) });
      setResentOk(true);
    } catch { /* ignore */ }
    finally { setResending(false); }
  };

  if (!profile) return (
    <div className="auth-screen">
      <p style={{ color: '#d4af37' }}>Carregando…</p>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
      background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,.07) 0%, transparent 70%), var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(201,168,76,.1)',
          gap: 8,
          position: 'sticky', top: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,.07) 0%, transparent 70%), var(--bg)',
          zIndex: 10,
        }}>
          <button className="auth-link" onClick={onBack} style={{ fontSize: 14, flexShrink: 0 }}>← Voltar</button>
          <h2 style={{ color: '#d4af37', margin: 0, fontSize: 17, textAlign: 'center' }}>Meu Perfil</h2>
          <button className="auth-link" onClick={onLogout} style={{ fontSize: 14, color: '#c04040', flexShrink: 0 }}>Sair</button>
        </div>

        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              ['⚡', 'Pontos',       profile.points],
              ['🏆', 'Vitórias',     profile.wins],
              ['💀', 'Derrotas',     profile.losses],
              ['🏅', 'Classificação', profile.rank != null ? `#${profile.rank}` : '—'],
            ] as const).map(([icon, label, val]) => (
              <div key={String(label)} style={{
                textAlign: 'center', background: '#2a0a3e',
                padding: '10px 4px', borderRadius: 8, flex: 1, minWidth: 0,
              }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ color: '#d4af37', fontWeight: 700, fontSize: 15 }}>{String(val)}</div>
                <div style={{ color: '#8060a0', fontSize: 9, lineHeight: 1.2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Info form */}
          <form onSubmit={saveInfo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ color: '#c8a870', margin: 0, fontSize: 13, letterSpacing: '.08em' }}>INFORMAÇÕES PESSOAIS</h3>

            <div className="auth-field">
              <label className="auth-label">Nome de guerreiro</label>
              <input className="join-input" value={profile.name} disabled
                style={{ opacity: 0.55, cursor: 'not-allowed' }} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Nome completo <span className="auth-optional">(opcional)</span></label>
              <input className="join-input" type="text" value={realName}
                onChange={e => setRealName(e.target.value)}
                placeholder="Seu nome real" maxLength={60} />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                E-mail
                {profile.email_verified
                  ? <span style={{ marginLeft: 8, color: '#50c050', fontSize: 11 }}>✓ verificado</span>
                  : <span style={{ marginLeft: 8, color: '#e08030', fontSize: 11 }}>⚠ não verificado</span>}
              </label>
              <input className="join-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" />
              {!profile.email_verified && (
                <button type="button" className="auth-link"
                  style={{ fontSize: 12, marginTop: 4, textAlign: 'left' }}
                  onClick={resendVerification} disabled={resending || resentOk}>
                  {resentOk ? '✓ E-mail enviado' : resending ? 'Enviando…' : 'Reenviar e-mail de verificação'}
                </button>
              )}
            </div>

            {infoErr && <p className="auth-error">{infoErr}</p>}
            {infoMsg && <p style={{ color: '#50c050', margin: 0, fontSize: 14 }}>{infoMsg}</p>}

            <button className="btn-primary" type="submit" disabled={savingInfo} style={{ width: '100%' }}>
              {savingInfo ? '⌛ Salvando…' : 'Salvar dados'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(201,168,76,.1)' }} />

          {/* Password form */}
          <form onSubmit={savePw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ color: '#c8a870', margin: 0, fontSize: 13, letterSpacing: '.08em' }}>ALTERAR SENHA</h3>

            <div className="auth-field">
              <label className="auth-label">Senha atual</label>
              <div style={{ position: 'relative' }}>
                <input className="join-input" type={showCurPw ? 'text' : 'password'} value={curPw}
                  onChange={e => setCurPw(e.target.value)}
                  placeholder="Senha atual" autoComplete="current-password"
                  style={{ paddingRight: 44 }} required />
                <button type="button" style={eyeBtn} tabIndex={-1}
                  onClick={() => setShowCurPw(v => !v)}
                  aria-label={showCurPw ? 'Ocultar senha' : 'Mostrar senha'}>
                  <EyeIcon open={showCurPw} />
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input className="join-input" type={showNewPw ? 'text' : 'password'} value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="new-password"
                  style={{ paddingRight: 44 }} required />
                <button type="button" style={eyeBtn} tabIndex={-1}
                  onClick={() => setShowNewPw(v => !v)}
                  aria-label={showNewPw ? 'Ocultar senha' : 'Mostrar senha'}>
                  <EyeIcon open={showNewPw} />
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Confirmar nova senha</label>
              <div style={{ position: 'relative' }}>
                <input className="join-input" type={showConfirm ? 'text' : 'password'} value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repita a nova senha" autoComplete="new-password"
                  style={{ paddingRight: 44 }} required />
                <button type="button" style={eyeBtn} tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                  aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {pwErr && <p className="auth-error">{pwErr}</p>}
            {pwMsg && <p style={{ color: '#50c050', margin: 0, fontSize: 14 }}>{pwMsg}</p>}

            <button className="btn-primary" type="submit"
              disabled={savingPw || !curPw || newPw.length < 8}
              style={{ width: '100%' }}>
              {savingPw ? '⌛ Alterando…' : 'Alterar senha'}
            </button>

            <div style={{ textAlign: 'center' }}>
              {resetSent
                ? <p style={{ color: '#50c050', fontSize: 13 }}>✓ E-mail de redefinição enviado!</p>
                : <button type="button" className="auth-link"
                    style={{ fontSize: 13 }}
                    onClick={sendPasswordReset}
                    disabled={resetSending}>
                    {resetSending ? 'Enviando…' : 'Esqueci minha senha'}
                  </button>
              }
            </div>
          </form>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(201,168,76,.1)' }} />

          {/* Privacy & Delete */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ color: '#c8a870', margin: 0, fontSize: 13, letterSpacing: '.08em' }}>PRIVACIDADE</h3>

            <button
              type="button"
              className="auth-link"
              style={{ fontSize: 13, textAlign: 'left' }}
              onClick={() => setShowPrivacy(true)}
            >
              <span className="mat-icon">docs</span> Ver Política de Privacidade (LGPD)
            </button>

            {/* Danger zone */}
            {!showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                style={{
                  background: 'none', border: '1px solid rgba(192,64,64,.35)',
                  color: '#c04040', borderRadius: 8, padding: '10px 14px',
                  cursor: 'pointer', fontSize: 13, textAlign: 'left',
                  width: '100%',
                }}
              >
                <span className="mat-icon">delete</span> Excluir minha conta e dados
              </button>
            ) : (
              <div style={{
                border: '1px solid rgba(192,64,64,.4)',
                borderRadius: 10, padding: '14px',
                background: 'rgba(192,64,64,.06)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <p style={{ color: '#e07070', fontWeight: 600, margin: 0, fontSize: 14 }}>
                  ⚠️ Excluir conta permanentemente
                </p>
                <p style={{ color: '#a07070', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                  Esta ação é <strong>irreversível</strong>. Todos os seus dados serão
                  apagados: perfil, e-mail, histórico de partidas e pontuação.
                </p>

                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  cursor: 'pointer', fontSize: 12, color: '#a07070',
                }}>
                  <input
                    type="checkbox"
                    checked={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.checked)}
                    style={{ marginTop: 2, accentColor: '#8b0000', flexShrink: 0 }}
                  />
                  Entendo que esta ação é permanente e não pode ser desfeita.
                </label>

                {deleteErr && <p className="auth-error">{deleteErr}</p>}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => { setShowDelete(false); setDeleteConfirm(false); setDeleteErr(''); }}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={!deleteConfirm || deleting}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 8,
                      background: deleteConfirm ? '#8b0000' : 'rgba(139,0,0,.3)',
                      color: deleteConfirm ? '#ffd700' : '#a06060',
                      border: 'none', cursor: deleteConfirm ? 'pointer' : 'not-allowed',
                      fontWeight: 700, fontSize: 13, transition: 'all .2s',
                    }}
                  >
                    {deleting ? '⌛ Excluindo…' : <><span className="mat-icon">delete</span>Excluir tudo</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom spacing */}
          <div style={{ height: 8 }} />

        </div>
      </div>

      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

