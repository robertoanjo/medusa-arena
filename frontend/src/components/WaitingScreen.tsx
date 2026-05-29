import React from 'react';

interface Props {
  playerName: string;
  onCancel: () => void;
}

export default function WaitingScreen({ playerName, onCancel }: Props) {
  return (
    <div className="waiting">
      <div className="waiting-orb">
        <div className="orb-ring orb-ring-1" />
        <div className="orb-ring orb-ring-2" />
        <div className="orb-snake">
          <img src="/images/card-medusa.png" alt="Medusa" className="waiting-medusa-img" />
        </div>
      </div>

      <div>
        <h2 className="waiting-title">
          Buscando oponente
          <span className="waiting-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </h2>
      </div>

      <p className="waiting-sub">
        Bem-vindo, <strong style={{ color: 'var(--gold)' }}>{playerName}</strong>
        <br />
        Prepare-se para olhar nos olhos da Medusa.
      </p>

      <button className="btn-ghost" onClick={onCancel}>
        ← Cancelar
      </button>
    </div>
  );
}
