import React from 'react';

interface TapeStripProps {
  color?: 'pink' | 'blue' | 'mint' | 'shiba';
  rotation?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const colorMap: Record<string, string> = {
  pink: '#F8C8DC',
  blue: '#B8D4E3',
  mint: '#A8DADC',
  shiba: '#F4A261',
};

const TapeStrip: React.FC<TapeStripProps> = ({
  color = 'pink',
  rotation = -3,
  width = 80,
  height = 24,
  className = '',
  style = {},
}) => {
  const bgColor = colorMap[color] || colorMap.pink;
  return (
    <div
      className={`absolute ${className}`}
      style={{
        width,
        height,
        backgroundColor: bgColor,
        opacity: 0.75,
        transform: `rotate(${rotation}deg)`,
        boxShadow: '0 2px 4px rgba(107, 79, 58, 0.15)',
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,0.3) 6px,
          rgba(255,255,255,0.3) 8px
        )`,
        ...style,
      }}
    />
  );
};

export default TapeStrip;
