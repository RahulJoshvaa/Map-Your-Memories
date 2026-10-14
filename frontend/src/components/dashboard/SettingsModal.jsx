import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  RotateCcw, 
  CheckCircle2
} from 'lucide-react';
import { Button } from '../Button';
import { useTheme } from '../../context/ThemeContext';
import { CURRENT_USER } from '../../data/mockMemories';

export const SettingsModal = ({
  isOpen,
  onClose,
  onResetData,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [mapboxToken, setMapboxToken] = useState(
    localStorage.getItem('mym_mapbox_token') || ''
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveToken = (e) => {
    e.preventDefault();
    if (mapboxToken.trim()) {
      localStorage.setItem('mym_mapbox_token', mapboxToken.trim());
    } else {
      localStorage.removeItem('mym_mapbox_token');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
      window.location.reload();
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062024]/75 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md my-8 rounded-2xl border-3 border-[#1a2c35] p-5 sm:p-6 transition-all
          ${
            isDark
              ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d,0_8px_0_3px_#1a2c35]'
              : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1,0_8px_0_3px_#1a2c35]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1a2c35]/15 dark:border-[#1a2c35]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffb72b] border-2 border-[#1a2c35] flex items-center justify-center text-[#1a2c35]">
              <SettingsIcon className="w-4 h-4 stroke-2" />
            </div>
            <div>
              <h3 id="settings-title" className="font-chunky font-bold text-lg">
                Settings
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded-xl border-2 border-[#1a2c35] bg-white dark:bg-[#0a2327] hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer shadow-xs active:scale-90 text-[#1a2c35] dark:text-neutral-200"
          >
            <X className="w-3.5 h-3.5 stroke-2.5" />
          </button>
        </div>

        {savedSuccess && (
          <div className="mt-3 p-2.5 rounded-xl border border-[#02a896] bg-[#02a896]/15 text-[#02a896] dark:text-[#ffb72b] text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* User Profile Info */}
          <div className={`p-3 rounded-xl border border-[#1a2c35]/30 flex items-center gap-3
            ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
          `}>
            <div className="w-9 h-9 rounded-lg bg-[#02a896] border border-[#1a2c35] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {CURRENT_USER.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-[#1a2c35] dark:text-white">
                {CURRENT_USER.name}
              </div>
              <div className="text-[11px] opacity-60 truncate">
                {CURRENT_USER.email}
              </div>
            </div>
          </div>

          {/* Mapbox Token Form */}
          <form onSubmit={handleSaveToken} className="space-y-2.5">
            <div>
              <label className="text-xs font-semibold block mb-1">
                Mapbox Access Token
              </label>
              <input
                type="text"
                placeholder="pk.eyJ1Ijo..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className={`w-full py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-normal text-xs outline-none transition-all
                  ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full"
            >
              Save Token
            </Button>
          </form>

          {/* Reset Mock Data */}
          <div className="pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all memory pins back to the default dataset?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full py-2 px-3 rounded-xl border border-[#1a2c35] btn-3d-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-2" />
              <span>Reset Mock Dataset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
