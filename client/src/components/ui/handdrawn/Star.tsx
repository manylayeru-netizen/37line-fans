import React from 'react';

interface StarProps {
  size?: number;
  color?: string;
  className?: string;
}

const Star: React.FC<StarProps> = ({ size = 24, color = '#F4A261', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
    >
      <path
        d="M12 2 L14.5 9 L22 9.5 L16 14.5 L18 22 L12 17.5 L6 22 L8 14.5 L2 9.5 L9.5 9 Z"
        stroke="#6B4F3A"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Star;
