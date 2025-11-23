import React from 'react';
import type { ComparisonImage } from '../types';

export const ComparisonCard: React.FC<{ image: ComparisonImage }> = ({ image }) => {
  return (
    <a 
      href={image.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group relative block rounded-lg overflow-hidden aspect-[4/3] bg-equi-navy border border-equi-slate/20 hover:border-equi-gold/50 transition-all"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
      
      {/* Since we might not get a direct image URL from text search without metadata parsing, 
          we use a placeholder style if it looks like a webpage link, or display if image. 
          For robustness in this demo, we assume the user clicks to view sources. 
      */}
      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-equi-slate group-hover:scale-105 transition-transform duration-500">
         {/* Placeholder logic for demo purposes as we don't have a real image proxy */}
         <div className="text-center p-2">
            <span className="text-2xl mb-2 block">🔗</span>
            <span className="text-xs font-mono">External Reference</span>
         </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
        <p className="text-xs font-semibold text-white truncate group-hover:text-equi-gold transition-colors">
          {image.title}
        </p>
        <p className="text-[10px] text-equi-slate truncate">
          Click to view source
        </p>
      </div>
    </a>
  );
};