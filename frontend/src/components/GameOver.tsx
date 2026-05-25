import React, { useEffect, useState } from 'react';

interface Info {
  won: boolean;
  myName: string;
  opponentName: string;
  myNewPoints: number;
  pointsChange: number;
  forfeit?: boolean;
}

interface Props {
  info: Info;
  onPlayAgain: () => void;
}

export default function GameOver({ info, onPlayAgain }: Props) {
  const { won, myName, opponentName, myNewPoints, pointsChange, forfeit } = info;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const subtitle = won
    ? forfeit
      ? `${opponentName} abandonou a batalha e foi petrificado!`
      : `${opponentName} foi petrificado pelo seu poder.`
    : forfeit
      ? `Você abandonou a batalha e foi petrificado.`
      : `${opponentName} te transformou em pedra.`;

  return (
    <div className="gameover">
      <span className="gameover-icon">{won ? '🏆' : '🗿'}</span>

      <h1 className={`gameover-title ${won ? 'won' : 'lost'}`}>
        {won
          ? forfeit ? `Vitória! ${opponentName} abandonou.` : 'Vitória!'
          : 'Petrificado!'}
      </h1>

      <p className="gameover-sub">{subtitle}</p>

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
