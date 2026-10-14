import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const baseStyles =
    'relative inline-flex items-center justify-center font-chunky font-extrabold tracking-wide rounded-2xl transition-all duration-150 select-none cursor-pointer';

  // True 3D tactile button styles
  const variants = {
    primary: isDark ? 'btn-3d-yellow' : 'btn-3d-teal',
    yellow: 'btn-3d-yellow',
    teal: 'btn-3d-teal',
    white: 'btn-3d-white',
  };

  const sizes = {
    sm: 'py-2 px-4 text-xs',
    md: 'py-3 px-5 text-sm sm:text-base',
    lg: 'py-3.5 px-7 text-base sm:text-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${disabled || isLoading ? 'opacity-65 cursor-not-allowed transform-none' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Signing in...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
