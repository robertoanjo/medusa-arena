import React from 'react';
import type { PlayerStats } from '../types';
import Leaderboard from './Leaderboard';

interface Props {
  playerName: string;
  leaderboard: PlayerStats[];
  onJoin: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onRefreshLeaderboard: () => void;
}

export default function HomeScreen({ playerName, leaderboard, onJoin, onLogout, onProfile, onRefreshLeaderboard }: Props) {
  return (
    <div className="home">
      {/* Hero */}
      <div className="home-hero">
        <img src="/images/logo.png" alt="Gaze of Medusa" className="home-logo" />
        <p className="home-subtitle">Batalha Mitológica · PvP em Tempo Real</p>
      </div>

      {/* Player info + actions */}
      <div className="home-player-bar">
        <span className="home-player-name">⚡ {playerName}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={onProfile} title="Meu perfil">
            Perfil
          </button>
          <button className="btn-ghost" onClick={onLogout} title="Sair da conta">
            Sair
          </button>
        </div>
      </div>

      {/* Enter arena */}
      <button className="btn-primary" style={{ width: '100%', maxWidth: '340px' }} onClick={onJoin}>
        ⚔️ Entrar na Arena
      </button>

      {/* Rules */}
      <div className="rules-block">
        <h3 className="rules-title">Regras da Arena</h3>
        <div className="rules-list">
          <div className="rule-row">
            <span className="rule-card">
              <img src="/images/card-shield.png" className="rule-card-img" alt="Escudo" />
              <strong>Escudo</strong>
            </span>
            <span className="rule-verb">vence</span>
            <span className="rule-card">
              <img src="/images/card-medusa.png" className="rule-card-img" alt="Medusa" />
              <strong>Medusa</strong>
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-card">
              <img src="/images/card-medusa.png" className="rule-card-img" alt="Medusa" />
              <strong>Medusa</strong>
            </span>
            <span className="rule-verb">vence</span>
            <span className="rule-card">
              <img src="/images/card-veil.png" className="rule-card-img rule-card-img--veil" alt="Véu" />
              <strong>Véu</strong>
            </span>
          </div>
          <div className="rule-row">
            <span className="rule-card">
              <img src="/images/card-veil.png" className="rule-card-img rule-card-img--veil" alt="Véu" />
              <strong>Véu</strong>
            </span>
            <span className="rule-verb">vence</span>
            <span className="rule-card">
              <img src="/images/card-shield.png" className="rule-card-img" alt="Escudo" />
              <strong>Escudo</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard
        rows={leaderboard}
        myName={playerName}
        onRefresh={onRefreshLeaderboard}
      />
    </div>
  );
}
