import React from 'react';
import { 
  MapPin, 
  Calendar, 
  Image, 
  Video, 
  X, 
  ArrowUpRight, 
  Star 
} from 'lucide-react';
import { Button } from '../Button';
import { useTheme } from '../../context/ThemeContext';

export const MemoryPreviewCard = ({
  memory,
  onClose,
  onViewDetails,
  onToggleFavorite,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!memory) return null;

  return (
    <div
      role="region"
      aria-label={`Preview of ${memory.title}`}
      className={`relative w-76 sm:w-84 rounded-2xl border-3 border-[#1a2c35] p-4 transition-all duration-200 select-none animate-fadeIn z-30
        ${
          isDark
            ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d,0_8px_0_3px_#1a2c35]'
            : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1,0_8px_0_3px_#1a2c35]'
        }
        ${className}
      `}
    >
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium opacity-70 flex items-center gap-1 truncate">
          <MapPin className="w-3.5 h-3.5 text-[#02a896] dark:text-[#ffb72b] shrink-0" />
          <span className="truncate">{memory.locationName}</span>
        </span>

        {/* Favorite & Close buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(memory.id)}
              aria-label={memory.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-1.5 rounded-lg border border-[#1a2c35] transition-colors cursor-pointer
                ${
                  memory.isFavorite
                    ? 'bg-[#ffb72b] text-[#1a2c35]'
                    : isDark
                    ? 'bg-[#0f343a] text-neutral-300 hover:text-[#ffb72b]'
                    : 'bg-[#fffae8] text-[#1a2c35]/70 hover:text-[#1a2c35]'
                }
              `}
            >
              <Star className={`w-3.5 h-3.5 ${memory.isFavorite ? 'fill-[#1a2c35]' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview card"
            className="p-1.5 rounded-xl border-2 border-[#1a2c35] bg-white dark:bg-[#0a2327] hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer shadow-xs active:scale-90 text-[#1a2c35] dark:text-neutral-200"
          >
            <X className="w-3.5 h-3.5 stroke-2.5" />
          </button>
        </div>
      </div>

      {/* Memory Title */}
      <h3 className="font-chunky font-bold text-base sm:text-lg leading-snug truncate">
        {memory.title}
      </h3>

      {/* Date */}
      <div className="mt-1 flex items-center gap-1 text-xs font-normal opacity-70">
        <Calendar className="w-3 h-3 text-[#02a896] dark:text-[#ffb72b]" />
        <span>{new Date(memory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {/* Media Count Summary */}
      <div className="mt-2.5 flex items-center gap-3 text-xs font-medium opacity-80">
        <span className="flex items-center gap-1">
          <Image className="w-3.5 h-3.5 text-[#02a896] dark:text-[#ffb72b]" />
          <span>{memory.mediaCount?.photos ?? 0} photos</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Video className="w-3.5 h-3.5 text-rose-500" />
          <span>{memory.mediaCount?.videos ?? 0} videos</span>
        </span>
      </div>

      {/* View Memory CTA button */}
      <div className="mt-3.5 pt-2.5 border-t border-dashed border-[#1a2c35]/20 dark:border-[#1a2c35]">
        <Button
          variant={isDark ? 'yellow' : 'teal'}
          size="sm"
          onClick={() => onViewDetails(memory)}
          className="w-full"
        >
          <span className="flex items-center justify-center gap-1 text-xs">
            <span>View Memory</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Button>
      </div>
    </div>
  );
};
