import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Plus, 
  X 
} from 'lucide-react';
import { MemoryCard } from '../components/dashboard/MemoryCard';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { getMyPins } from '../services/memoryService';

export const MyPinsView = ({
  memories = [],
  onLocateOnMap,
  onViewDetails,
  onToggleFavorite,
  onCreateClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [titleQuery, setTitleQuery] = useState('');

  const myPins = useMemo(() => {
    return getMyPins(titleQuery, memories);
  }, [titleQuery, memories]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Search Header Row (Minimal, No Oversized Section Headings) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input: "Search pins..." */}
        <div className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-[#1a2c35]/50 dark:text-neutral-400">
              <Search className="w-4 h-4 stroke-2" />
            </div>

            <input
              type="text"
              id="my-pins-search"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="Search pins..."
              className={`w-full py-2 pl-9 pr-8 rounded-xl font-medium text-xs sm:text-sm border-2 border-[#1a2c35] outline-none transition-all
                ${
                  isDark
                    ? 'bg-[#0d292e] text-white placeholder:text-neutral-500 shadow-[0_2px_0_0_#041a1d] focus:border-[#ffb72b]'
                    : 'bg-[#faf8f5] text-[#1a2c35] placeholder:text-[#1a2c35]/40 shadow-[0_2px_0_0_#e2d7c5] focus:bg-white focus:border-[#02a896]'
                }
              `}
            />

            {titleQuery && (
              <button
                type="button"
                onClick={() => setTitleQuery('')}
                className="absolute right-2.5 p-1 rounded-lg text-[#1a2c35]/60 hover:text-[#1a2c35] dark:text-neutral-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimal Create Pin Button */}
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl btn-3d-yellow font-semibold text-xs tracking-wider uppercase cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4 stroke-2.5 text-[#1a2c35]" />
          <span>Create Pin</span>
        </button>
      </div>

      {/* Pins Card Grid */}
      {myPins.length === 0 ? (
        <div className={`p-8 rounded-2xl border-2 border-[#1a2c35] text-center max-w-sm mx-auto
          ${
            isDark
              ? 'bg-[#0d292e] shadow-[0_4px_0_0_#041a1d]'
              : 'bg-white shadow-[0_4px_0_0_#e2d7c5]'
          }
        `}>
          <p className="text-xs font-normal opacity-70 mb-3">
            {titleQuery ? `No pins matching "${titleQuery}".` : 'No pins created yet.'}
          </p>
          {titleQuery ? (
            <Button variant="white" size="sm" onClick={() => setTitleQuery('')}>
              Clear Search
            </Button>
          ) : (
            <Button variant="yellow" size="sm" onClick={onCreateClick}>
              Create Pin
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {myPins.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              variant="mypins"
              onLocateOnMap={onLocateOnMap}
              onViewDetails={onViewDetails}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
