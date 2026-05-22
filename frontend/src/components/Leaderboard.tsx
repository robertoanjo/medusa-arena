import React from 'react';
import type { PlayerStats } from '../types';

interface Props {
  rows: PlayerStats[];
  myName?: string;
  onRefresh: () => void;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ rows, myName, onRefresh }: Props) {
  return (
    <div className="leaderboard">
      <div className="section-title">
        Ranking Global
        <button
          onClick={onRefresh}
          title="Atualizar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-dim)',
            fontSize: '13px',
            padding: '0 4px',
            marginLeft: 'auto',
          }}
        >
          ↺
        </button>
      </div>

      {rows.length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
          Nenhum guerreiro ainda. Seja o primeiro!
        </p>
      )}

      {rows.map((p, i) => (
        <div
          key={p.name}
          className="lb-row"
          style={p.name === myName ? { background: 'rgba(201,168,76,.07)', borderRadius: '8px' } : {}}
        >
          <span className={`lb-rank ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}`}>
            {i < 3 ? MEDAL[i] : `${i + 1}`}
          </span>
          <span className="lb-name" style={p.name === myName ? { color: 'var(--gold)' } : {}}>
            {p.name}
            {p.name === myName && (
              <span style={{ fontSize: '9px', marginLeft: '6px', color: 'var(--text-dim)', letterSpacing: '.1em' }}>
                VOCÊ
              </span>
            )}
          </span>
          <span className="lb-wl">{p.wins}V {p.losses}D</span>
          <span className="lb-pts">{p.points}</span>
        </div>
      ))}
    </div>
  );
}
