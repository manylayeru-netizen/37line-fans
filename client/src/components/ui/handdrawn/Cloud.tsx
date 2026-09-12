import React from 'react';

interface CloudProps {
  size?: number;
  className?: string;
}

const Cloud: React.FC<CloudProps> = ({ size = 80, className = '' }) => {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 100 60"
      fill="none"
      className={className}
    >
      <path
        d="M20 45 Q8 45 8 33 Q8 22 20 22 Q22 12 34 12 Q44 6 54 14 Q62 8 72 16 Q84 14 86 26 Q94 28 92 40 Q90 50 78 50 L22 50 Q20 50 20 45 Z"
        fill="#FFFAF0"
        stroke="#6B4F3A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="32" cy="30" rx="3" ry="2" fill="#6B4F3A" opacity="0.3" />
      <ellipse cx="58" cy="28" rx="4" ry="2.5" fill="#6B4F3A" opacity="0.3" />
    </svg>
  );
};

export default Cloud;
