import React from 'react';

interface PolaroidFrameProps {
  title?: string;
  rotation?: number;
  className?: string;
  children: React.ReactNode;
}

const PolaroidFrame: React.FC<PolaroidFrameProps> = ({
  title,
  rotation = 0,
  className = '',
  children,
}) => {
  return (
    <div
      className={`polaroid-frame inline-block ${className}`}
      style={{
        transform: `rotate(${rotation}deg)`,
        background: 'white',
        padding: '10px 10px 44px 10px',
        boxShadow: '0 4px 12px rgba(107, 79, 58, 0.2)',
        borderRadius: '2px',
        position: 'relative',
      }}
    >
      <div className="w-full h-full overflow-hidden">{children}</div>
      {title && (
        <div
          className="absolute bottom-2 left-0 right-0 text-center font-handwriting text-cocoa text-sm"
          style={{ lineHeight: '1.2' }}
        >
          {title}
        </div>
      )}
    </div>
  );
};

export default PolaroidFrame;
