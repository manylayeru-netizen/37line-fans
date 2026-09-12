import React from 'react';

interface ErrorStateProps {
  message?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message = '哎呀，出了点小问题～' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-4xl mb-4">🐾</div>
      <p className="font-handwriting text-xl text-cocoa/70">{message}</p>
      <p className="text-sm text-cocoa/50 mt-2">请稍后再试哦</p>
    </div>
  );
};

export default ErrorState;
