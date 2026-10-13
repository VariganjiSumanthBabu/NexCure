import React from 'react';

interface NexCureLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'full' | 'mark-only' | 'text-only';
  inverted?: boolean;
}

export const NexCureLogo: React.FC<NexCureLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = true,
  variant = 'full',
  inverted = false,
}) => {
  // Sizing definitions
  const dimensions = {
    sm: { mark: 'w-7 h-7', text: 'text-lg', tag: 'text-[9px]' },
    md: { mark: 'w-10 h-10', text: 'text-2xl', tag: 'text-[10px]' },
    lg: { mark: 'w-14 h-14', text: 'text-3xl', tag: 'text-xs' },
    xl: { mark: 'w-20 h-20', text: 'text-4xl', tag: 'text-sm' },
  }[size];

  // SVG Mark matching the uploaded logo:
  // - A supportive hand (rich deep wine burgundy #8B1538)
  // - Heart with heartbeat pulse wave line
  // - Twin swirling heart wing arcs (rose pink #E25B7E)
  const MarkIcon = (
    <svg
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimensions.mark} shrink-0`}
      aria-label="NexCure Brand Mark"
    >
      {/* Background soft glow (subtle) */}
      <defs>
        <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EE7796" />
          <stop offset="100%" stopColor="#DE4E76" />
        </linearGradient>
        <linearGradient id="wineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A3183D" />
          <stop offset="100%" stopColor="#7B102F" />
        </linearGradient>
      </defs>

      {/* Outer Heart Arc Left (Pink/Rose) */}
      <path
        d="M80 34 C64 12, 38 10, 24 24 C10 38, 12 60, 28 78 C38 90, 52 100, 68 106 C62 98, 56 86, 56 74 C56 58, 66 42, 80 34 Z"
        fill="url(#roseGrad)"
        opacity="0.95"
      />

      {/* Outer Heart Arc Right (Pink/Rose) */}
      <path
        d="M80 34 C96 12, 122 10, 136 24 C150 38, 148 60, 132 78 C122 90, 108 100, 92 106 C98 98, 104 86, 104 74 C104 58, 94 42, 80 34 Z"
        fill="url(#roseGrad)"
        opacity="0.95"
      />

      {/* Inner Heart (Deep Burgundy / Wine) */}
      <path
        d="M80 48 C72 36, 58 36, 52 44 C46 52, 48 64, 58 74 L80 96 L102 74 C112 64, 114 52, 108 44 C102 36, 88 36, 80 48 Z"
        fill="url(#wineGrad)"
      />

      {/* Heartbeat pulse wave inside inner heart */}
      <path
        d="M62 67 H69 L73 59 L78 76 L83 62 L87 70 L91 67 H98"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Supporting Cradle Hand (Deep Wine / Burgundy) */}
      <path
        d="M32 94 C46 86, 68 84, 88 88 C104 91, 118 97, 130 92 C134 90, 138 92, 140 96 C143 103, 134 112, 120 119 C102 127, 78 126, 56 118 C44 114, 30 108, 26 102 C24 99, 28 96, 32 94 Z"
        fill="url(#wineGrad)"
      />
    </svg>
  );

  if (variant === 'mark-only') {
    return <div className={`inline-flex items-center ${className}`}>{MarkIcon}</div>;
  }

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        {variant !== 'text-only' && MarkIcon}
        <div className="flex flex-col">
          <div className={`font-bold tracking-tight leading-none ${dimensions.text}`}>
            <span className={inverted ? 'text-white' : 'text-[#881337]'}>Nex</span>
            <span className={inverted ? 'text-rose-300' : 'text-[#E15B7C]'}>Cure</span>
          </div>
          {showTagline && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`h-px w-3 ${inverted ? 'bg-rose-300/40' : 'bg-[#E15B7C]/40'}`} />
              <span
                className={`font-semibold tracking-[0.22em] uppercase ${dimensions.tag} ${
                  inverted ? 'text-rose-200' : 'text-[#9F1239]'
                }`}
              >
                Care, Connected.
              </span>
              <span className={`h-px w-3 ${inverted ? 'bg-rose-300/40' : 'bg-[#E15B7C]/40'}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
