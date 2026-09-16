import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
     <div className="relative mb-8 md:mb-12 text-center">
       <div className="absolute -top-3 left-1/4 w-20 md:w-24 h-5 md:h-6 bg-tape-pink/70 -rotate-6 shadow-sm" />
       <div className="absolute -top-2 right-1/4 w-16 md:w-20 h-4 md:h-5 bg-tape-blue/70 rotate-6 shadow-sm" />
       <h1 className="font-handwriting text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-ink flex items-center justify-center gap-2 md:gap-3 pt-4">
        {icon && <span>{icon}</span>}
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-cocoa/70 text-sm">{subtitle}</p>
      )}
    </div>
  );
};

export default PageHeader;
