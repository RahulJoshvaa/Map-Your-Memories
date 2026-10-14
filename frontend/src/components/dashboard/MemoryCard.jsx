import React from 'react';
import { 
  MapPin, 
  Calendar, 
  Image, 
  Video, 
  Star, 
  Navigation, 
  ArrowUpRight 
} from 'lucide-react';
import { Button } from '../Button';
import { useTheme } from '../../context/ThemeContext';

export const MemoryCard = ({
  memory,
  variant = 'default',
  onLocateOnMap,
  onViewDetails,
  onToggleFavorite,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formattedDate = new Date(memory.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      role="article"
      aria-label={memory.title}
      className={`rounded-2xl border-2.5 border-[#1a2c35] p-4 sm:p-5 transition-all duration-200 select-none group flex flex-col justify-between
        ${
          isDark
            ? 'bg-[#0d292e] text-white shadow-[0_4px_0_0_#041a1d,0_4px_0_2.5px_#1a2c35] hover:-translate-y-0.5'
            : 'bg-white text-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1,0_4px_0_2.5px_#1a2c35] hover:-translate-y-0.5'
        }
        ${className}
      `}
    >
      <div>
        {/* Top Meta Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium opacity-70 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#02a896] dark:text-[#ffb72b] shrink-0" />
              <span className="truncate">{memory.locationName}</span>
            </span>
          </div>

          {/* Star Favorite Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(memory.id)}
              aria-label={memory.isFavorite ? 'Unfavorite' : 'Favorite'}
              className={`p-1.5 rounded-lg border border-[#1a2c35] transition-colors cursor-pointer shrink-0
                ${
                  memory.isFavorite
                    ? 'bg-[#ffb72b] text-[#1a2c35]'
                    : isDark
                    ? 'bg-[#0a2327] text-neutral-300 hover:text-[#ffb72b]'
                    : 'bg-[#fffae8] text-[#1a2c35]/70 hover:text-[#1a2c35]'
                }
              `}
            >
              <Star className={`w-3.5 h-3.5 ${memory.isFavorite ? 'fill-[#1a2c35]' : ''}`} />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="font-chunky font-bold text-base sm:text-lg leading-snug group-hover:text-[#02a896] dark:group-hover:text-[#ffb72b] transition-colors truncate">
          {memory.title}
        </h3>

        {/* Date */}
        <div className="mt-1 flex items-center gap-1.5 text-xs font-normal opacity-65">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>

        {/* Description snippet */}
        <p className={`mt-2.5 text-xs sm:text-sm font-normal line-clamp-2 leading-relaxed
          ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/75'}
        `}>
          {memory.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-[#1a2c35]/20 dark:border-[#1a2c35]">
        {/* Media summary row */}
        <div className="flex items-center justify-between text-xs font-medium opacity-70 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Image className="w-3 h-3 text-[#02a896]" />
              {memory.mediaCount?.photos ?? 0} photos
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3 text-rose-500" />
              {memory.mediaCount?.videos ?? 0} videos
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant={isDark ? 'yellow' : 'teal'}
            size="sm"
            onClick={() => onViewDetails(memory)}
            className="flex-1"
          >
            <span className="flex items-center justify-center gap-1 text-xs">
              <span>View Memory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Button>

          <button
            type="button"
            onClick={() => onLocateOnMap(memory)}
            title="Locate on map"
            className="p-2 rounded-xl border border-[#1a2c35] btn-3d-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <Navigation className="w-3.5 h-3.5 text-[#02a896]" />
          </button>
        </div>
      </div>
    </div>
  );
};
