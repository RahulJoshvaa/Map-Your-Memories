import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Yellow Light mode' : 'Switch to Teal Dark mode'}
      className={`group relative w-9 h-16 rounded-full border-3 border-[#1a2c35] p-1 flex flex-col justify-between transition-all duration-200 select-none cursor-pointer
        ${isDark ? 'bg-[#0f4347] shadow-[0_4px_0_0_#062b2e]' : 'bg-[#e09e1f] shadow-[0_4px_0_0_#9a6208]'}
        ${className}
      `}
    >
      {/* Switch knob that slides vertically like the Chunky Duck toggle */}
      <div
        className={`w-6 h-6 rounded-full border-2 border-[#1a2c35] flex items-center justify-center transition-all duration-200 shadow-sm
          ${
            isDark
              ? 'translate-y-7 bg-[#23c3b0]'
              : 'translate-y-0 bg-[#ffd65c]'
          }
        `}
      >
        {isDark ? (
          /* Moon icon in knob */
          <svg className="w-3.5 h-3.5 text-[#1a2c35] fill-current" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          /* Sun icon in knob */
          <svg className="w-3.5 h-3.5 text-[#1a2c35] fill-current" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="12" y1="21" x2="12" y2="23" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="1" y1="12" x2="3" y2="12" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="21" y1="12" x2="23" y2="12" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#1a2c35" strokeWidth="2.5" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#1a2c35" strokeWidth="2.5" />
          </svg>
        )}
      </div>

      {/* Target indicator icon at opposite side */}
      <div className="w-full flex items-center justify-center opacity-70">
        {isDark ? (
          <span className="text-[10px] font-black text-amber-300">☀️</span>
        ) : (
          <span className="text-[10px] font-black text-[#1a2c35]">🌙</span>
        )}
      </div>
    </button>
  );
};
