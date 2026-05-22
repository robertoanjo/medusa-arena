import React, { useEffect, useRef, useState } from 'react';

interface Props {
  current: number;
  max?: number;
  reverse?: boolean;
}

export default function EnergyBar({ current, max = 12, reverse = false }: Props) {
  const [breaking, setBreaking] = useState<number | null>(null);
  const prevRef = useRef(current);

  useEffect(() => {
    if (current < prevRef.current) {
      setBreaking(current); // index that just broke
      const t = setTimeout(() => setBreaking(null), 600);
      prevRef.current = current;
      return () => clearTimeout(t);
    }
    prevRef.current = current;
  }, [current]);

  const indices = Array.from({ length: max }, (_, i) => (reverse ? max - 1 - i : i));

  return (
    <div className="energy-bar">
      {indices.map((i) => (
        <div
          key={i}
          className={[
            'energy-seg',
            i < current ? 'active' : 'lost',
            i === breaking ? 'breaking' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  );
}
