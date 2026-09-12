import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
      <div className="bg-paper rounded-2xl p-12 shadow-md text-center max-w-md border-2 border-dashed border-grid">
        <div className="flex justify-center mb-6">
          <Construction size={48} className="text-shiba" />
        </div>
        <h1 className="font-handwriting text-3xl text-ink mb-3">{title}</h1>
        <p className="text-cocoa/70 mb-2">
          {description || '这个版块正在精心制作中...'}
        </p>
        <p className="text-cocoa/50 text-sm mb-6 font-mono">{location.pathname}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-shiba text-white rounded-full font-handwriting text-lg hover:bg-shiba/90 transition-colors shadow-sm"
        >
          回到首页
        </button>
      </div>
    </div>
  );
};

export default PlaceholderPage;
