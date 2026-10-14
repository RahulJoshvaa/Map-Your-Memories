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

      {/* Overlay: Cluster Selection Card (Shown when clicking a multi-pin cluster, e.g. Ooty) */}
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
