import React from 'react';
import type { PlayerStats } from '../types';
import Leaderboard from './Leaderboard';
import MedusaHead  from './MedusaHead';

interface Props {
  playerName: string;
  leaderboard: PlayerStats[];
  onJoin: () => void;
  onLogout: () => void;
  onRefreshLeaderboard: () => void;
}

export default function HomeScreen({ playerName, leaderboard, onJoin, onLogout, onRefreshLeaderboard }: Props) {
  return (
    <div className="home">
      {/* Hero */}
      <div className="home-hero">
        <MedusaHead size={72} className="home-medusa" />
        <h1 className="home-title">Medusa Arena</h1>
        <p className="home-subtitle">Batalha Mitológica · PvP em Tempo Real</p>
      </div>

      {/* Player info + actions */}
      <div className="home-player-bar">
        <span className="home-player-name">⚡ {playerName}</span>
        <button className="btn-ghost" onClick={onLogout} title="Sair da conta">
          Sair
        </button>
      </div>

      {/* Enter arena */}
      <button className="btn-primary" style={{ width: '100%', maxWidth: '340px' }} onClick={onJoin}>
        ⚔️ Entrar na Arena
      </button>

      {/* Rules */}
      <div className="rules-strip">
        <span className="rule-pill"><strong>🛡️ Escudo</strong> vence 🐍 Medusa</span>
        <span className="rule-pill"><strong>🐍 Medusa</strong> vence 🌫️ Véu</span>
        <span className="rule-pill"><strong>🌫️ Véu</strong> vence 🛡️ Escudo</span>
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
