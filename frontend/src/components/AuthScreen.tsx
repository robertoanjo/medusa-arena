import React, { useState } from 'react';
import MedusaHead from './MedusaHead';

const SERVER =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

interface Props {
  onAuth: (token: string, name: string) => void;
}

type Tab = 'login' | 'register';

export default function AuthScreen({ onAuth }: Props) {
  const [tab, setTab]         = useState<Tab>('login');
  const [name, setName]       = useState('');
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const reset = (nextTab: Tab) => {
    setTab(nextTab);
    setError('');
    setPass('');
    setConfirm('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'register' && password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(`${SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro desconhecido.');
      } else {
        localStorage.setItem('medusa_token', data.token);
        localStorage.setItem('medusa_name',  data.player.name);
        onAuth(data.token, data.player.name);
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
        {/* Logo */}
        <div className="auth-hero">
          <MedusaHead size={72} className="auth-medusa" />
          <h1 className="home-title" style={{ fontSize: 'clamp(18px,5vw,28px)' }}>
            Medusa Arena
          </h1>
          <p className="home-subtitle">Batalha Mitológica · PvP Online</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => reset('login')}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => reset('register')}
            type="button"
          >
            Criar Conta
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="auth-label">Nome de guerreiro</label>
            <input
              className="join-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Perseus, Atalanta…"
              maxLength={20}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Senha</label>
            <input
              className="join-input"
              type="password"
              value={password}
              onChange={e => setPass(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              minLength={4}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {tab === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Confirmar senha</label>
              <input
                className="join-input"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            className="btn-primary"
            type="submit"
            disabled={loading || name.trim().length < 2 || password.length < 4}
          >
            {loading
              ? '⌛ Aguarde…'
              : tab === 'login'
              ? '⚔️ Entrar na Arena'
              : '🐍 Criar Conta'}
          </button>
        </form>

        <p className="auth-switch">
          {tab === 'login' ? (
            <>Novo por aqui?{' '}
              <button className="auth-link" onClick={() => reset('register')} type="button">
                Criar conta
              </button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button className="auth-link" onClick={() => reset('login')} type="button">
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
