import React from 'react';

interface SunProps {
  size?: number;
  className?: string;
}

const Sun: React.FC<SunProps> = ({ size = 70, className = '' }) => {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
    >
      {rays.map((angle: number, idx: number) => (
        <line
          key={idx}
          x1="50"
          y1="50"
          x2="50"
          y2="10"
          stroke="#F4A261"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="22" fill="#F4A261" stroke="#6B4F3A" strokeWidth="2" />
      <circle cx="43" cy="47" r="2.5" fill="#6B4F3A" />
      <circle cx="57" cy="47" r="2.5" fill="#6B4F3A" />
      <path
        d="M 42 56 Q 50 63 58 56"
        stroke="#6B4F3A"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="53" rx="3" ry="2" fill="#F8C8DC" opacity="0.7" />
      <ellipse cx="62" cy="53" rx="3" ry="2" fill="#F8C8DC" opacity="0.7" />
    </svg>
  );
};

export default Sun;
