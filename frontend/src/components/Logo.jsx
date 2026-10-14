import React from 'react';
import { Compass, MapPin } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Logo = ({ 
  className = '', 
  size = 'md',
  showSubtitle = true 
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const titleSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  };

  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* 3D Chunky emblem */}
      <div className="relative group cursor-pointer transition-transform hover:scale-105">
        <div className="w-13 h-13 sm:w-14 sm:h-14 bg-[#ffb72b] rounded-2xl border-3 border-[#1a2c35] shadow-[0_5px_0_0_#a35d10,0_5px_0_3px_#1a2c35] flex items-center justify-center transition-all">
          <div className="relative flex items-center justify-center">
            <MapPin 
              className="w-8 h-8 fill-[#02a896] text-[#1a2c35] drop-shadow-sm" 
              stroke="#1a2c35" 
              strokeWidth={2.5} 
            />
          </div>
        </div>

        {/* Small live badge dot */}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
          <span className="relative inline-flex rounded-full h-4 w-4 bg-[#02a896] border-2 border-[#1a2c35]"></span>
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-chunky font-extrabold tracking-tight leading-tight ${titleSizes[size] || titleSizes.md} ${isDark ? 'text-white' : 'text-[#1a2c35]'}`}>
            Map Your <span className="text-[#ffb72b] drop-shadow-[0_2px_0_#1a2c35]">Memories</span>
          </span>
        </div>
        {showSubtitle && (
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-[#23c3b0]' : 'text-[#875505]'}`}>
            <Compass className="w-3.5 h-3.5" /> Geographic Memory Vault
          </span>
        )}
      </div>
    </div>
  );
};
