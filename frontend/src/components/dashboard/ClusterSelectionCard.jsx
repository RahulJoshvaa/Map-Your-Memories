import React from 'react';
import { 
  Layers, 
  X, 
  ChevronRight, 
  Calendar,
  Image,
  Video
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ClusterSelectionCard = ({
  cluster,
  onSelectMemory,
  onClose,
  className = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!cluster || !cluster.memories || cluster.memories.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-label={`Multiple memories at ${cluster.locationName || 'this location'}`}
      className={`relative w-80 sm:w-88 rounded-2xl border-3 border-[#1a2c35] p-4 transition-all select-none animate-fadeIn z-30
        ${
          isDark
            ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d,0_8px_0_3px_#1a2c35]'
            : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1,0_8px_0_3px_#1a2c35]'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ffb72b] border-1.5 border-[#1a2c35] text-[#1a2c35] flex items-center justify-center font-bold text-xs">
            {cluster.count}
          </div>
          <div>
            <h3 className="font-chunky font-bold text-base leading-tight">
              {cluster.locationName}
            </h3>
            <span className="text-[11px] font-normal opacity-60">
              {cluster.count} memories at this location
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close selection panel"
          className="p-1 rounded-xl border-2 border-[#1a2c35] bg-white dark:bg-[#0a2327] hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer shadow-xs active:scale-90 text-[#1a2c35] dark:text-neutral-200 shrink-0"
        >
          <X className="w-3.5 h-3.5 stroke-2.5" />
        </button>
      </div>

      {/* Memory List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {cluster.memories.map((mem) => (
          <button
            key={mem.id}
            type="button"
            onClick={() => onSelectMemory(mem)}
            className={`w-full p-2.5 rounded-xl border border-[#1a2c35]/30 text-left transition-all duration-150 cursor-pointer group flex items-center justify-between gap-2
              ${
                isDark
                  ? 'bg-[#0a2327] hover:bg-[#0f4347] hover:border-[#1a2c35]'
                  : 'bg-[#faf8f5] hover:bg-[#fffae8] hover:border-[#1a2c35]'
              }
            `}
          >
            <div className="min-w-0 flex-1">
              <div className="font-chunky font-bold text-xs sm:text-sm truncate group-hover:text-[#02a896] dark:group-hover:text-[#ffb72b] transition-colors">
                {mem.title}
              </div>

              <div className="flex items-center gap-2 text-[10px] opacity-60 mt-0.5">
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {mem.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Image className="w-3 h-3" /> {mem.mediaCount?.photos ?? 0}
                </span>
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-[#1a2c35]/50 dark:text-neutral-400 group-hover:text-[#1a2c35] dark:group-hover:text-white transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
