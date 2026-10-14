import React from 'react';
import { MapView } from '../components/dashboard/MapView';
import { MemoryPreviewCard } from '../components/dashboard/MemoryPreviewCard';
import { ClusterSelectionCard } from '../components/dashboard/ClusterSelectionCard';
import { useTheme } from '../context/ThemeContext';

export const HomeMapView = ({
  memories = [],
  selectedMemory,
  onSelectMemory,
  onClosePreview,
  selectedCluster,
  onSelectCluster,
  onCloseCluster,
  onViewDetails,
  onToggleFavorite,
  focusCoords,
  activeFilter,
  onFilterChange,
  isLocationPicker,
  pickedLocation,
  onLocationPicked,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="relative flex-1 w-full h-full min-h-[500px] flex flex-col overflow-hidden">
      {/* Central Mapbox GL JS Map */}
      <MapView
        memories={memories}
        selectedMemory={selectedMemory}
        onSelectMemory={onSelectMemory}
        onSelectCluster={onSelectCluster}
        focusCoords={focusCoords}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        isLocationPicker={isLocationPicker}
        pickedLocation={pickedLocation}
        onLocationPicked={onLocationPicked}
      />

      {/* Top Banner when Location Picker Mode is active */}
      {isLocationPicker && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="px-5 py-2.5 rounded-2xl bg-[#ffb72b] text-[#1a2c35] border-3 border-[#1a2c35] shadow-[0_4px_0_0_#1a2c35] flex items-center gap-2 font-chunky font-bold text-xs sm:text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a2c35] animate-ping" />
            <span>Click anywhere on the map to set pin location</span>
          </div>
        </div>
      )}

      {/* Overlay: Memory Preview Card (Shown when clicking a single marker) */}
      {selectedMemory && !isLocationPicker && (
        <div className="absolute bottom-5 left-4 sm:left-6 z-30 max-w-[calc(100vw-32px)]">
          <MemoryPreviewCard
            memory={selectedMemory}
            onClose={onClosePreview}
            onViewDetails={onViewDetails}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      )}

      {/* Overlay: Empty State when user has no memories yet */}
      {memories.length === 0 && !isLocationPicker && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 max-w-sm w-[calc(100vw-32px)]">
          <div className={`p-4 rounded-2xl border-2 border-[#1a2c35] text-center backdrop-blur-xs
            ${
              isDark
                ? 'bg-[#0d292e]/90 text-white shadow-[0_4px_0_0_#041a1d]'
                : 'bg-white/95 text-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1]'
            }
          `}>
            <p className="text-xs font-semibold mb-1">
              No memories yet. Create your first pin.
            </p>
            <p className="text-[11px] opacity-70">
              Click "Create Pin" in the sidebar or top bar to place a memory on the map.
            </p>
          </div>
        </div>
      )}

      {/* Overlay: Cluster Selection Card (Shown when clicking a multi-pin cluster, e.g. co-located pins) */}
      {selectedCluster && !isLocationPicker && (
        <div className="absolute bottom-5 left-4 sm:left-6 z-30 max-w-[calc(100vw-32px)]">
          <ClusterSelectionCard
            cluster={selectedCluster}
            onSelectMemory={(mem) => {
              onCloseCluster();
              onSelectMemory(mem);
            }}
            onClose={onCloseCluster}
          />
        </div>
      )}
    </div>
  );
};
