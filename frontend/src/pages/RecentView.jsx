import React, { useMemo } from 'react';
import { MemoryCard } from '../components/dashboard/MemoryCard';
import { useTheme } from '../context/ThemeContext';
import { getRecentMemories } from '../services/memoryService';

export const RecentView = ({
  memories = [],
  onLocateOnMap,
  onViewDetails,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const recentList = useMemo(() => {
    return getRecentMemories(memories);
  }, [memories]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Top info */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-65">
          Recently accessed pins
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {recentList.map((memory) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            variant="recent"
            onLocateOnMap={onLocateOnMap}
            onViewDetails={onViewDetails}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  );
};
