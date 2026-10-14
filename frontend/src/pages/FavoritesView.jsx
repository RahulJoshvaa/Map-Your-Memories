import React, { useMemo } from 'react';
import { MemoryCard } from '../components/dashboard/MemoryCard';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { getFavoriteMemories } from '../services/memoryService';

export const FavoritesView = ({
  memories = [],
  onLocateOnMap,
  onViewDetails,
  onToggleFavorite,
  onGoToHome,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const favorites = useMemo(() => {
    return getFavoriteMemories(memories);
  }, [memories]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-65">
          {favorites.length} starred memories
        </span>
        <button
          type="button"
          onClick={onGoToHome}
          className="px-3 py-1.5 rounded-xl border border-[#1a2c35] btn-3d-white text-xs font-medium cursor-pointer"
        >
          View Map
        </button>
      </div>

      {/* Grid */}
      {favorites.length === 0 ? (
        <div className={`p-8 rounded-2xl border-2 border-[#1a2c35] text-center max-w-sm mx-auto
          ${
            isDark
              ? 'bg-[#0d292e] shadow-[0_4px_0_0_#041a1d]'
              : 'bg-white shadow-[0_4px_0_0_#e2d7c5]'
          }
        `}>
          <p className="text-xs font-normal opacity-70 mb-3">
            Star memories on the map to collect them here.
          </p>
          <Button variant="yellow" size="sm" onClick={onGoToHome}>
            Explore Map
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favorites.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              variant="favorite"
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
