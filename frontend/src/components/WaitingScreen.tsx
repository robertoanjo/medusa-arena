import React from 'react';
import MedusaHead from './MedusaHead';

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
        <div className="orb-snake"><MedusaHead size={44} /></div>
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
