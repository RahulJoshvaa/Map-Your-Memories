import React from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Image, 
  Video, 
  Star, 
  Navigation, 
  ShieldCheck
} from 'lucide-react';
import { Button } from '../Button';
import { useTheme } from '../../context/ThemeContext';

export const MemoryDetailModal = ({
  memory,
  isOpen,
  onClose,
  onLocateOnMap,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen || !memory) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062024]/80 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-detail-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl my-8 rounded-2xl border-3 border-[#1a2c35] p-5 sm:p-7 transition-all
          ${
            isDark
              ? 'bg-[#0d292e] text-white shadow-[0_10px_0_0_#041a1d,0_10px_0_3px_#1a2c35]'
              : 'bg-white text-[#1a2c35] shadow-[0_10px_0_0_#cbd5e1,0_10px_0_3px_#1a2c35]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#1a2c35]/15 dark:border-[#1a2c35]">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium opacity-75 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#02a896] dark:text-[#ffb72b]" />
                {memory.locationName}
              </span>
              <span className="text-xs opacity-50">
                ({memory.latitude?.toFixed(4)}, {memory.longitude?.toFixed(4)})
              </span>
            </div>

            <h2 id="memory-detail-title" className="font-chunky font-bold text-xl sm:text-2xl leading-tight truncate">
              {memory.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(memory.id)}
                aria-label={memory.isFavorite ? 'Remove favorite' : 'Add favorite'}
                className={`p-1.5 rounded-xl border border-[#1a2c35] transition-all cursor-pointer
                  ${
                    memory.isFavorite
                      ? 'bg-[#ffb72b] text-[#1a2c35]'
                      : 'btn-3d-white text-[#1a2c35]'
                  }
                `}
              >
                <Star className={`w-4 h-4 ${memory.isFavorite ? 'fill-[#1a2c35]' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-xl border border-[#1a2c35] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-[#1a2c35] dark:text-neutral-200" />
            </button>
          </div>
        </div>

        {/* Metadata & Narrative */}
        <div className="mt-4 space-y-4">
          <div className={`p-3 rounded-xl border border-[#1a2c35]/25 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs
            ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
          `}>
            <div>
              <span className="opacity-60 block">Date</span>
              <span className="font-semibold">
                {new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div>
              <span className="opacity-60 block">Owner</span>
              <span className="font-semibold truncate block">
                {memory.owner?.name}
              </span>
            </div>

            <div>
              <span className="opacity-60 block">Photos</span>
              <span className="font-semibold text-[#02a896] dark:text-[#ffb72b]">
                {memory.mediaCount?.photos ?? 0} photos
              </span>
            </div>

            <div>
              <span className="opacity-60 block">Videos</span>
              <span className="font-semibold text-rose-500">
                {memory.mediaCount?.videos ?? 0} videos
              </span>
            </div>
          </div>

          {/* Description Story */}
          <div>
            <p className="text-xs sm:text-sm font-normal leading-relaxed p-3.5 rounded-xl border border-[#1a2c35]/20 bg-neutral-50 dark:bg-[#062024]/60">
              {memory.description || 'No additional narrative recorded.'}
            </p>
          </div>

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {memory.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium border border-[#1a2c35]/30 bg-neutral-100 text-[#1a2c35] dark:bg-[#0a2327] dark:text-neutral-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-[#1a2c35]/15 dark:border-[#1a2c35] flex items-center justify-between gap-3">
          <span className="text-[11px] font-normal opacity-60 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#02a896]" />
            <span>Vault GPS encrypted</span>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="white"
              size="sm"
              onClick={() => {
                onLocateOnMap(memory);
                onClose();
              }}
            >
              <span className="flex items-center gap-1.5 text-xs">
                <Navigation className="w-3.5 h-3.5 text-[#02a896]" />
                <span>Locate on Map</span>
              </span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
