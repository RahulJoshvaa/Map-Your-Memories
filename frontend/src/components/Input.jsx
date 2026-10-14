import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const Input = ({
  label,
  error,
  icon,
  rightElement,
  id,
  className = '',
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Icon colour based on theme
  const iconColour = isDark ? 'text-neutral-400' : 'text-[#1a2c35]/50';

  // Theme-specific idle background + text
  const inputTheme = isDark
    ? 'bg-[#0a2327] text-white placeholder:text-neutral-500 border-[#1a2c35] shadow-[0_4px_0_0_#041a1d]'
    : 'bg-white text-[#1a2c35] placeholder:text-[#1a2c35]/35 border-[#1a2c35] shadow-[0_4px_0_0_#c5bfb4]';

  // Error state overrides
  const inputError = error
    ? isDark
      ? 'border-rose-500 bg-rose-950/20 shadow-[0_4px_0_0_#be123c]'
      : 'border-rose-500 bg-rose-50 shadow-[0_4px_0_0_#be123c]'
    : '';

  const handleFocus = (e) => {
    if (error) return;
    e.currentTarget.style.borderColor = isDark ? '#ffb72b' : '#02a896';
    e.currentTarget.style.boxShadow = isDark
      ? '0 4px 0 0 #a35d10, 0 0 0 3px rgba(255,183,43,0.20)'
      : '0 4px 0 0 #076159, 0 0 0 3px rgba(2,168,150,0.20)';
    e.currentTarget.style.backgroundColor = isDark ? '#0e2d32' : '#ffffff';
  };

  const handleBlur = (e) => {
    if (error) return;
    e.currentTarget.style.borderColor = '#1a2c35';
    e.currentTarget.style.boxShadow = isDark ? '0 4px 0 0 #041a1d' : '0 4px 0 0 #c5bfb4';
    e.currentTarget.style.backgroundColor = isDark ? '#0a2327' : '#ffffff';
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label
          htmlFor={id}
          className={`text-sm font-chunky font-bold tracking-wide select-none ${isDark ? 'text-neutral-100' : 'text-[#1a2c35]'}`}
        >
          {label}
        </label>
      </div>

      <div className="relative flex items-center">
        {icon && (
          <div className={`absolute left-4 pointer-events-none flex items-center justify-center ${iconColour}`}>
            {icon}
          </div>
        )}

        <input
          id={id}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`
            w-full py-3.5 font-semibold rounded-2xl border-3 transition-all duration-150 outline-none
            ${icon ? 'pl-11' : 'pl-4'}
            ${rightElement ? 'pr-12' : 'pr-4'}
            ${inputTheme}
            ${inputError}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs font-bold text-rose-500 flex items-center gap-1 mt-0.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
