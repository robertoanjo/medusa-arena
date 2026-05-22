import React from 'react';

interface Props {
  timeLeft: number;
  maxTime: number;
}

export default function TurnTimer({ timeLeft, maxTime }: Props) {
  const size = 64;
  const r = 26;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (timeLeft / maxTime) * circ;
  const urgent = timeLeft <= 2;
  const color = urgent ? '#ef4444' : '#c9a84c';

  return (
    <div className="turn-timer">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1c1c28" strokeWidth="3.5" />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
        <text
          x={cx} y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize="17"
          fontWeight="700"
          fontFamily="'Cinzel', serif"
        >
          {timeLeft}
        </text>
      </svg>
      <span className="timer-label">tempo</span>
    </div>
  );
}
