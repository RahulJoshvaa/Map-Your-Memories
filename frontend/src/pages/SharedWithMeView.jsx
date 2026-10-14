import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X
} from 'lucide-react';
import { MemoryCard } from '../components/dashboard/MemoryCard';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { getSharedWithMe } from '../services/memoryService';

export const SharedWithMeView = ({
  memories = [],
  onLocateOnMap,
  onViewDetails,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [permissionFilter, setPermissionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const sharedMemories = useMemo(() => {
    let list = getSharedWithMe(memories);
    if (permissionFilter !== 'ALL') {
      list = list.filter((m) => m.permission === permissionFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.owner?.name?.toLowerCase().includes(q) ||
          m.locationName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [memories, permissionFilter, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Filter and Search Bar (Minimal, No Giant Headings or Emojis) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-[#1a2c35]/50 dark:text-neutral-400">
              <Search className="w-4 h-4 stroke-2" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shared pins..."
              className={`w-full py-2 pl-9 pr-8 rounded-xl font-medium text-xs sm:text-sm border-2 border-[#1a2c35] outline-none transition-all
                ${
                  isDark
                    ? 'bg-[#0d292e] text-white placeholder:text-neutral-500 shadow-[0_2px_0_0_#041a1d] focus:border-[#02a896]'
                    : 'bg-[#faf8f5] text-[#1a2c35] placeholder:text-[#1a2c35]/40 shadow-[0_2px_0_0_#e2d7c5] focus:bg-white focus:border-[#02a896]'
                }
              `}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-lg text-[#1a2c35]/60 hover:text-[#1a2c35] dark:text-neutral-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {['ALL', 'EDITOR', 'VIEWER'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPermissionFilter(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border border-[#1a2c35] transition-all cursor-pointer
                ${
                  permissionFilter === p
                    ? 'bg-[#02a896] text-white shadow-[0_2px_0_0_#076159]'
                    : isDark
                    ? 'bg-[#0d292e] text-neutral-300 hover:bg-[#0f343a]'
                    : 'bg-white text-[#1a2c35] hover:bg-[#fffae8]'
                }
              `}
            >
              {p === 'ALL' ? 'All Roles' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {sharedMemories.length === 0 ? (
        <div className={`p-8 rounded-2xl border-2 border-[#1a2c35] text-center max-w-sm mx-auto
          ${
            isDark
              ? 'bg-[#0d292e] shadow-[0_4px_0_0_#041a1d]'
              : 'bg-white shadow-[0_4px_0_0_#e2d7c5]'
          }
        `}>
          <p className="text-xs font-normal opacity-70 mb-3">
            No shared memories matched your search.
          </p>
          {searchQuery && (
            <Button
              variant="white"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sharedMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              variant="shared"
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
