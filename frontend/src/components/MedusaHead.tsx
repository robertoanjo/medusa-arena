import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

/* Ilustração SVG da Cabeça da Medusa com cabelos-serpente */
export default function MedusaHead({ size = 80, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 105"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cabeça da Medusa"
    >
      <defs>
        <filter id="mh-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="mh-glow-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="mh-face" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#3c3a28" />
          <stop offset="70%" stopColor="#25231a" />
          <stop offset="100%" stopColor="#141310" />
        </radialGradient>
        <radialGradient id="mh-eye-l" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#80ffc0" />
          <stop offset="50%" stopColor="#00e878" />
          <stop offset="100%" stopColor="#00803a" />
        </radialGradient>
        <radialGradient id="mh-eye-r" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#80ffc0" />
          <stop offset="50%" stopColor="#00e878" />
          <stop offset="100%" stopColor="#00803a" />
        </radialGradient>
      </defs>

      {/* ── Serpentes / cabelo ─────────────────── */}

      {/* Serpente central (topo) */}
      <path d="M50,40 C48,30 52,22 49,14 C47,8 50,3 50,0"
        stroke="#00cc66" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="0" rx="3.5" ry="2.5" fill="#00aa44" />
      <path d="M50,-2.5 L47.5,-6 M50,-2.5 L52.5,-6" stroke="#cc2222" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* Serpente esquerda-centro */}
      <path d="M44,42 C39,31 36,21 32,12 C30,7 31,3 30,0"
        stroke="#00bb55" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="0" rx="3" ry="2.2" fill="#00994d" transform="rotate(-15 30 0)" />
      <path d="M29,-2 L26,-5.5 M29,-2 L31.5,-5.5" stroke="#cc2222" strokeWidth="0.7" fill="none" strokeLinecap="round" />

      {/* Serpente direita-centro */}
      <path d="M56,42 C61,31 64,21 68,12 C70,7 69,3 70,0"
        stroke="#00bb55" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <ellipse cx="70" cy="0" rx="3" ry="2.2" fill="#00994d" transform="rotate(15 70 0)" />
      <path d="M71,-2 L68.5,-5.5 M71,-2 L73.5,-5.5" stroke="#cc2222" strokeWidth="0.7" fill="none" strokeLinecap="round" />

      {/* Serpente esquerda */}
      <path d="M40,47 C30,41 19,36 10,28 C4,22 2,16 3,10"
        stroke="#009944" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="3" cy="10" rx="3" ry="2" fill="#007733" transform="rotate(-50 3 10)" />
      <path d="M1.5,8 L-2,5 M1.5,8 L1,4" stroke="#cc2222" strokeWidth="0.7" fill="none" strokeLinecap="round" />

      {/* Serpente direita */}
      <path d="M60,47 C70,41 81,36 90,28 C96,22 98,16 97,10"
        stroke="#009944" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="97" cy="10" rx="3" ry="2" fill="#007733" transform="rotate(50 97 10)" />
      <path d="M98.5,8 L102,5 M98.5,8 L99,4" stroke="#cc2222" strokeWidth="0.7" fill="none" strokeLinecap="round" />

      {/* Serpente esquerda-lateral (quase horizontal) */}
      <path d="M38,54 C24,54 11,52 3,46 C-1,42 0,37 2,33"
        stroke="#008833" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="2" cy="33" rx="2.8" ry="1.8" fill="#006622" transform="rotate(-70 2 33)" />

      {/* Serpente direita-lateral (quase horizontal) */}
      <path d="M62,54 C76,54 89,52 97,46 C101,42 100,37 98,33"
        stroke="#008833" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="98" cy="33" rx="2.8" ry="1.8" fill="#006622" transform="rotate(70 98 33)" />

      {/* ── Tiara / Coroa ────────────────────── */}
      <path d="M31,56 Q35,49 40,54 Q45,45 50,51 Q55,45 60,54 Q65,49 69,56"
        fill="none" stroke="#c9a84c" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="51" r="2" fill="#e0b84e" />
      <circle cx="40" cy="54" r="1.5" fill="#c9a84c" />
      <circle cx="60" cy="54" r="1.5" fill="#c9a84c" />

      {/* ── Rosto ────────────────────────────── */}
      {/* Sombra */}
      <ellipse cx="51" cy="79" rx="27" ry="28" fill="rgba(0,0,0,0.45)" />
      {/* Face principal */}
      <ellipse cx="50" cy="77" rx="26" ry="27" fill="url(#mh-face)" />
      {/* Borda do rosto */}
      <ellipse cx="50" cy="77" rx="26" ry="27" fill="none"
        stroke="#3a3825" strokeWidth="1" />

      {/* ── Olhos ────────────────────────────── */}
      {/* Sombra dos olhos */}
      <ellipse cx="38" cy="71" rx="7.5" ry="5" fill="#0d1a0d" />
      <ellipse cx="62" cy="71" rx="7.5" ry="5" fill="#0d1a0d" />
      {/* Íris verde brilhante */}
      <ellipse cx="38" cy="71" rx="6" ry="4.5"
        fill="url(#mh-eye-l)" filter="url(#mh-glow)" />
      <ellipse cx="62" cy="71" rx="6" ry="4.5"
        fill="url(#mh-eye-r)" filter="url(#mh-glow)" />
      {/* Pupila vertical (serpentina) */}
      <ellipse cx="38" cy="71" rx="1.8" ry="3.8" fill="#001200" />
      <ellipse cx="62" cy="71" rx="1.8" ry="3.8" fill="#001200" />
      {/* Brilho */}
      <circle cx="36" cy="69.5" r="1.2" fill="rgba(255,255,255,0.4)" />
      <circle cx="60" cy="69.5" r="1.2" fill="rgba(255,255,255,0.4)" />

      {/* ── Nariz ────────────────────────────── */}
      <path d="M47.5,77 L44.5,85 Q50,87 55.5,85 L52.5,77"
        fill="#1e1c12" opacity="0.55" />
      <path d="M45.5,85 Q50,87.5 54.5,85"
        stroke="#2a2818" strokeWidth="1" fill="none" />

      {/* ── Lábios ───────────────────────────── */}
      <path d="M41,92 Q45,89 50,90.5 Q55,89 59,92"
        stroke="#7a3535" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M42,92 Q50,97 58,92"
        stroke="#6a2a2a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
