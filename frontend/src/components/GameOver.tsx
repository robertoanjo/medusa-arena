import React, { useEffect, useState } from 'react';

interface Info {
  won: boolean;
  myName: string;
  opponentName: string;
  myNewPoints: number;
  pointsChange: number;
}

interface Props {
  info: Info;
  onPlayAgain: () => void;
}

export default function GameOver({ info, onPlayAgain }: Props) {
  const { won, myName, opponentName, myNewPoints, pointsChange } = info;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="gameover">
      <span className="gameover-icon">{won ? '🏆' : '🗿'}</span>

      <h1 className={`gameover-title ${won ? 'won' : 'lost'}`}>
        {won ? 'Vitória!' : 'Petrificado!'}
      </h1>

      <p className="gameover-sub">
        {won
          ? `${opponentName} foi petrificado pelo seu poder.`
          : `${opponentName} te transformou em pedra.`}
      </p>

      <div className="gameover-points">
        <span className="gameover-points-label">Seus pontos</span>
        <span className="gameover-points-val">{myNewPoints}</span>
        <span className={`gameover-points-delta ${pointsChange >= 0 ? 'pos' : 'neg'}`}>
          {pointsChange >= 0 ? `+${pointsChange}` : `${pointsChange}`} pontos
        </span>
      </div>

      <div className="gameover-actions">
        <button className="btn-primary" onClick={onPlayAgain}>
          ⚔️ Jogar novamente
        </button>
      </div>
    </div>
  );
}
