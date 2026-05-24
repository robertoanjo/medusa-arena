import React, { useState } from 'react';
import type { CardType, GameState } from '../types';
import EnergyBar from './EnergyBar';
import CardReveal from './CardReveal';

interface Props {
  gameState: GameState;
  onMakeChoice: (card: CardType) => void;
  onForfeit: () => void;
}

const CARDS: { type: CardType; emoji: string; labelTop: string; labelBot: string; desc: string }[] = [
  { type: 'SHIELD', emoji: '🛡️', labelTop: 'Escudo',  labelBot: 'Espelhado', desc: 'Reflete a Medusa' },
  { type: 'VEIL',   emoji: '🌫️', labelTop: 'Véu',    labelBot: 'Místico',   desc: 'Encobre o Escudo' },
  { type: 'MEDUSA', emoji: '🐍', labelTop: 'Cabeça',  labelBot: 'da Medusa', desc: 'Penetra o Véu' },
];

export default function GameScreen({ gameState, onMakeChoice, onForfeit }: Props) {
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const {
    myName,
    opponentName,
    myEnergy,
    opponentEnergy,
    phase,
    myChoice,
    opponentChoice,
    lastWinnerName,
    lastLoserName,
    isTie,
  } = gameState;

  const isRevealing = phase === 'revealing';
  const isChoosing  = phase === 'choosing';
  const hasChosen   = !!myChoice && isChoosing;

  const iWon  = isRevealing && lastWinnerName === myName;
  const iLost = isRevealing && lastLoserName  === myName;

  // Round banner text
  let bannerText = '';
  let bannerClass = 'round-banner';
  if (isRevealing) {
    if (isTie) { bannerText = '⚔️ Empate! Turno reinicia…'; bannerClass += ' tie'; }
    else if (iWon)  { bannerText = '✨ Você venceu o turno!'; bannerClass += ' win'; }
    else if (iLost) { bannerText = '💀 Energia perdida!';     bannerClass += ' lose'; }
  } else if (hasChosen) {
    bannerText = '⌛ Aguardando oponente…';
    bannerClass += ' reveal';
  }

  return (
    <div className="game">
      {/* ── Opponent panel ─────────────────────────── */}
      <div className="opponent-panel">
        <div className="opponent-info">
          <span className="opponent-name">☠ {opponentName}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="opponent-status">{opponentEnergy} energia</span>
            {confirmForfeit ? (
              <span style={{ display: 'flex', gap: '5px' }}>
                <button
                  className="btn-forfeit-confirm"
                  onClick={() => { onForfeit(); setConfirmForfeit(false); }}
                >
                  Confirmar
                </button>
                <button
                  className="btn-forfeit-cancel"
                  onClick={() => setConfirmForfeit(false)}
                >
                  ✕
                </button>
              </span>
            ) : (
              <button
                className="btn-forfeit"
                onClick={() => setConfirmForfeit(true)}
                title="Abandonar partida (derrota)"
              >
                Abandonar
              </button>
            )}
          </div>
        </div>
        <EnergyBar current={opponentEnergy} />
      </div>

      {/* ── Battle area ────────────────────────────── */}
      <div className="battle-area">
        <div className="battle-cards">
          <CardReveal
            card={isRevealing ? opponentChoice : null}
            flipped={isRevealing}
            isWinner={isRevealing && lastWinnerName !== myName && !isTie}
            isLoser={isRevealing && lastLoserName  !== myName && !isTie}
            label={opponentName}
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span className="battle-vs">VS</span>
          </div>

          <CardReveal
            card={myChoice ?? null}
            flipped={isRevealing || (isChoosing && !!myChoice)}
            isWinner={iWon}
            isLoser={iLost}
            label={myName}
          />
        </div>

        {/* Round result banner */}
        {bannerText && <p className={bannerClass}>{bannerText}</p>}
      </div>

      {/* ── My panel ───────────────────────────────── */}
      <div className="my-panel">
        <div className="my-info">
          <span className="my-name">⚡ {myName}</span>
          <span className={`my-status ${hasChosen ? 'chosen' : ''}`}>
            {hasChosen ? '✓ Escolha feita' : isRevealing ? '' : 'Escolha sua carta'}
          </span>
        </div>
        <EnergyBar current={myEnergy} />

        {/* Card selector */}
        <div className="card-selector">
          {CARDS.map(({ type, emoji, labelTop, labelBot, desc }) => {
            const selected  = myChoice === type;
            const disabled  = isRevealing || !!myChoice;
            const faded     = disabled && !selected;

            return (
              <button
                key={type}
                className={[
                  'card-btn',
                  `card-${type}`,
                  selected ? 'selected' : '',
                  faded    ? 'faded'    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onMakeChoice(type)}
                disabled={disabled}
                aria-label={`Escolher ${labelTop} ${labelBot}`}
              >
                <span className="card-emoji">{emoji}</span>
                <span className="card-labels">
                  <span className="card-label-top">{labelTop}</span>
                  <span className="card-label-bot">{labelBot}</span>
                </span>
                <span className="card-desc">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
