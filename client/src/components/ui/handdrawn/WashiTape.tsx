import React from 'react';

interface WashiTapeProps {
  color?: 'pink' | 'blue' | 'mint' | 'shiba' | 'yellow';
  rotation?: number;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  pattern?: 'dots' | 'stripes' | 'plain' | 'grid';
}

const colorMap: Record<string, string> = {
  pink: '#F8C8DC',
  blue: '#B8D4E3',
  mint: '#A8DADC',
  shiba: '#F4A261',
  yellow: '#FFF3D6',
};

const WashiTape: React.FC<WashiTapeProps> = ({
  color = 'pink',
  rotation = -5,
  width = 100,
  className = '',
  style = {},
  pattern = 'dots',
}) => {
  const bgColor = colorMap[color] || colorMap.pink;
  const height = 28;

  const getPattern = (): string => {
    switch (pattern) {
      case 'dots':
        return `radial-gradient(circle, rgba(255,255,255,0.5) 1.5px, transparent 2px)`;
      case 'stripes':
        return `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.4) 6px, rgba(255,255,255,0.4) 8px)`;
      case 'grid':
        return `
          linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
        `;
      default:
        return 'none';
    }
  };

  return (
    <div
      className={`absolute ${className}`}
      style={{
        width,
        height,
        backgroundColor: bgColor,
        opacity: 0.8,
        transform: `rotate(${rotation}deg)`,
        boxShadow: '0 2px 6px rgba(107, 79, 58, 0.12)',
        backgroundImage: getPattern(),
        backgroundSize: pattern === 'grid' ? '10px 10px' : '12px 12px',
        borderLeft: '2px dashed rgba(107, 79, 58, 0.15)',
        borderRight: '2px dashed rgba(107, 79, 58, 0.15)',
        ...style,
      }}
    />
  );
};

export default WashiTape;
