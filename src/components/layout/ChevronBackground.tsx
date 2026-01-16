'use client';

import { useTheme } from 'next-themes';

export function ChevronBackground() {
  const { theme } = useTheme();

  // 浅色模式用 lime，深色模式用 amber
  const strokeColor = theme === 'dark' ? '#f59e0b' : '#84cc16';

  return (
    <>
      {/* Left Chevrons */}
      <div className="chevron-decoration chevron-left">
        <svg viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M150 50 L50 200 L150 350"
            stroke={strokeColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />
          <path
            d="M200 80 L100 200 L200 320"
            stroke={strokeColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.1"
          />
        </svg>
      </div>

      {/* Right Chevrons */}
      <div className="chevron-decoration chevron-right">
        <svg viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 50 L150 200 L50 350"
            stroke={strokeColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />
          <path
            d="M0 80 L100 200 L0 320"
            stroke={strokeColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.1"
          />
        </svg>
      </div>
    </>
  );
}
