import React, { useEffect, useState } from 'react';
import type { CardType } from '../types';

interface Props {
  card: CardType | null;
  flipped: boolean;
  isWinner: boolean;
  isLoser: boolean;
  label: string;
}

const CARD_CONFIG: Record<CardType, { emoji: string; name: string[] }> = {
  SHIELD: { emoji: '🛡️', name: ['Escudo', 'Espelhado'] },
  VEIL:   { emoji: '🌫️', name: ['Véu',    'Místico']   },
  MEDUSA: { emoji: '🐍', name: ['Cabeça',  'da Medusa'] },
};

export default function CardReveal({ card, flipped, isWinner, isLoser, label }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (flipped) {
      const t = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
    }
  }, [flipped]);

  const cfg = card ? CARD_CONFIG[card] : null;

  const classes = [
    'reveal-card',
    animate ? 'flipped' : '',
    card ? `card-${card}` : '',
    isWinner ? 'winner' : '',
    isLoser  ? 'loser'  : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '10px', letterSpacing: '.14em', color: 'var(--text-dim)', fontFamily: "'Cinzel', serif", textTransform: 'uppercase' }}>
        {label}
      </span>
      <div className={classes}>
        <div className="reveal-card-inner">
          {/* Back (face-down) */}
          <div className="reveal-card-back">
            <span>⚔️</span>
            <span className="card-label-sm">Escolhendo</span>
          </div>
          {/* Front (revealed) */}
          <div className="reveal-card-front">
            {cfg && (
              <>
                <span className="card-emoji-lg">{cfg.emoji}</span>
                <span className="card-name-sm">
                  {cfg.name[0]}<br />{cfg.name[1]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
