import React from 'react';

interface MiloMascotProps {
  size?: number;
  className?: string;
}

/**
 * MILO: Original Minecraft-inspired pixel-art emerald mascot.
 */
export const MiloMascot: React.FC<MiloMascotProps> = ({ size = 40, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
      aria-label="MILO pixel emerald mascot"
      role="img"
    >
      {/* Dark outline */}
      <rect x="5" y="1" width="6" height="1" fill="#132D1E" />
      <rect x="4" y="2" width="1" height="1" fill="#132D1E" />
      <rect x="11" y="2" width="1" height="1" fill="#132D1E" />
      <rect x="3" y="3" width="1" height="2" fill="#132D1E" />
      <rect x="12" y="3" width="1" height="2" fill="#132D1E" />
      <rect x="2" y="5" width="1" height="6" fill="#132D1E" />
      <rect x="13" y="5" width="1" height="6" fill="#132D1E" />
      <rect x="3" y="11" width="1" height="2" fill="#132D1E" />
      <rect x="12" y="11" width="1" height="2" fill="#132D1E" />
      <rect x="4" y="13" width="1" height="1" fill="#132D1E" />
      <rect x="11" y="13" width="1" height="1" fill="#132D1E" />
      <rect x="5" y="14" width="6" height="1" fill="#132D1E" />

      {/* Outer emerald facets */}
      <rect x="5" y="2" width="6" height="1" fill="#34D399" />
      <rect x="4" y="3" width="8" height="2" fill="#17A34A" />
      <rect x="3" y="5" width="10" height="6" fill="#17A34A" />
      <rect x="4" y="11" width="8" height="2" fill="#15803D" />
      <rect x="5" y="13" width="6" height="1" fill="#1B402A" />

      {/* Inner bright emerald core */}
      <rect x="5" y="4" width="6" height="7" fill="#34D399" />
      <rect x="4" y="5" width="1" height="5" fill="#34D399" />
      <rect x="11" y="5" width="1" height="5" fill="#15803D" />

      {/* Pixel specular highlight */}
      <rect x="5" y="3" width="2" height="1" fill="#A7F3D0" />
      <rect x="4" y="4" width="1" height="2" fill="#A7F3D0" />

      {/* Friendly pixel eyes */}
      <rect x="5" y="7" width="1" height="2" fill="#132D1E" />
      <rect x="10" y="7" width="1" height="2" fill="#132D1E" />
      <rect x="5" y="7" width="1" height="1" fill="#231D17" />
      <rect x="10" y="7" width="1" height="1" fill="#231D17" />

      {/* Subtle pixel smile */}
      <rect x="7" y="10" width="2" height="1" fill="#132D1E" />
    </svg>
  );
};
