import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text = '正在翻页...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-4xl animate-bounce mb-4">⭐</div>
      <p className="font-handwriting text-xl text-cocoa/70">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
