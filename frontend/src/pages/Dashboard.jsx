import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from '../components/dashboard/Sidebar';
import { TopBar } from '../components/dashboard/TopBar';
import { HomeMapView } from './HomeMapView';
import { MyPinsView } from './MyPinsView';
import { SharedWithMeView } from './SharedWithMeView';
import { FavoritesView } from './FavoritesView';
import { RecentView } from './RecentView';
import { MemoryDetailPage } from './MemoryDetailPage';
import { CreateMemoryModal } from '../components/dashboard/CreateMemoryModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { useTheme } from '../context/ThemeContext';
import { 
  fetchMemories, 
  filterMemoriesByQuery, 
  createMemory, 
  toggleFavoriteMemory, 
  resetMemoriesToDefault,
  getMyPins,
  getSharedWithMe,
  getFavoriteMemories
} from '../services/memoryService';

export const Dashboard = ({ onSignOut }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Navigation & View state
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'mypins' | 'shared' | 'favorites' | 'recent' | 'memory-detail'
  const [previousTab, setPreviousTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data state
  const [memories, setMemories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Map & Pin Interaction state
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [detailMemory, setDetailMemory] = useState(null);
  const [focusCoords, setFocusCoords] = useState(null);

  // Modals & Map Location Picker flow
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);

  // Initial load
  const loadData = useCallback(async () => {
    const list = await fetchMemories();
    setMemories(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side search results (ready for future FastAPI semantic search endpoint)
  const searchResults = useMemo(() => {
    return filterMemoriesByQuery(searchQuery, memories);
  }, [searchQuery, memories]);

  // Filtered memories for map display
  const mapMemories = useMemo(() => {
    let list = searchResults;
    if (activeFilter === 'mypins') {
      list = getMyPins('', list);
    } else if (activeFilter === 'shared') {
      list = getSharedWithMe(list);
    } else if (activeFilter === 'favorites') {
      list = getFavoriteMemories(list);
    }
    return list;
  }, [searchResults, activeFilter]);

  // Sidebar count badges
  const counts = useMemo(() => {
    return {
      myPins: getMyPins('', memories).length,
      shared: getSharedWithMe(memories).length,
      favorites: getFavoriteMemories(memories).length,
    };
  }, [memories]);

  // Handlers
  const handleSelectMemory = useCallback((memory) => {
    setSelectedCluster(null);
    setSelectedMemory(memory);
  }, []);

  const handleSelectCluster = useCallback((cluster) => {
    setSelectedMemory(null);
    setSelectedCluster(cluster);
  }, []);

  // Navigate directly to the dedicated Memory Detail Page showing all images, videos, audios
  const handleViewMemoryDetail = useCallback((memory) => {
    setPreviousTab(activeTab === 'memory-detail' ? 'home' : activeTab);
    setDetailMemory(memory);
    setActiveTab('memory-detail');
    setSelectedMemory(null);
    setSelectedCluster(null);
  }, [activeTab]);

  const handleLocateOnMap = useCallback((memory) => {
    setActiveTab('home');
    setSelectedCluster(null);
    setSelectedMemory(memory);
    setFocusCoords({ lat: memory.latitude, lng: memory.longitude });
  }, []);

  const handleQuickResultSelect = useCallback((memory) => {
    handleLocateOnMap(memory);
  }, [handleLocateOnMap]);

  const handleToggleFavorite = async (id) => {
    await toggleFavoriteMemory(id);
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
    if (selectedMemory && selectedMemory.id === id) {
      setSelectedMemory((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
    if (detailMemory && detailMemory.id === id) {
      setDetailMemory((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const handleCreatePin = async (data) => {
    const created = await createMemory(data);
    await loadData();
    setIsPickingLocationOnMap(false);
    setPickedLocation(null);
    handleLocateOnMap(created);
  };

  const handleResetData = () => {
    const fresh = resetMemoriesToDefault();
    setMemories(fresh);
    setSelectedMemory(null);
    setSelectedCluster(null);
  };

  // Location Picker Flow: User clicks "Select on Map" in Create Pin modal
  const handleStartMapPick = () => {
    setIsCreateOpen(false);
    setActiveTab('home');
    setIsPickingLocationOnMap(true);
  };

  // User clicked on map -> capture coords and reopen modal
  const handleLocationPicked = (coords) => {
    setPickedLocation(coords);
    setIsPickingLocationOnMap(false);
    setIsCreateOpen(true);
  };

  return (
    <div className={`h-screen w-screen flex overflow-hidden selection:bg-[#ffb72b] selection:text-[#1a2c35] transition-colors duration-200
      ${
        isDark
          ? 'bg-[#062024] text-white'
          : 'bg-[#f8f5ee] text-[#1a2c35]'
      }
    `}>
      {/* 1. SIDEBAR */}
      <Sidebar
        activeTab={activeTab === 'memory-detail' ? previousTab : activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSelectedMemory(null);
          setSelectedCluster(null);
          setIsPickingLocationOnMap(false);
        }}
        onCreateClick={() => {
          setIsCreateOpen(true);
          setIsPickingLocationOnMap(false);
        }}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onSignOut={onSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        counts={counts}
      />

      {/* Main Content Area: TopBar + Page Body */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* 2. TOP BAR */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onQuickResultSelect={handleQuickResultSelect}
          searchResults={searchResults}
          activeTab={activeTab}
        />

        {/* 3. DYNAMIC CONTENT SECTION */}
        <main 
          key={activeTab}
          className="flex-1 flex flex-col overflow-hidden relative z-10 animate-page-enter"
        >
          {activeTab === 'home' && (
            <HomeMapView
              memories={mapMemories}
              selectedMemory={selectedMemory}
              onSelectMemory={handleSelectMemory}
              onClosePreview={() => setSelectedMemory(null)}
              selectedCluster={selectedCluster}
              onSelectCluster={handleSelectCluster}
              onCloseCluster={() => setSelectedCluster(null)}
              onViewDetails={handleViewMemoryDetail}
              onToggleFavorite={handleToggleFavorite}
              focusCoords={focusCoords}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              isLocationPicker={isPickingLocationOnMap}
              pickedLocation={pickedLocation}
              onLocationPicked={handleLocationPicked}
            />
          )}

          {activeTab === 'mypins' && (
            <MyPinsView
              memories={memories}
              onLocateOnMap={handleLocateOnMap}
              onViewDetails={handleViewMemoryDetail}
              onToggleFavorite={handleToggleFavorite}
              onCreateClick={() => setIsCreateOpen(true)}
            />
          )}

          {activeTab === 'shared' && (
            <SharedWithMeView
              memories={memories}
              onLocateOnMap={handleLocateOnMap}
              onViewDetails={handleViewMemoryDetail}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesView
              memories={memories}
              onLocateOnMap={handleLocateOnMap}
              onViewDetails={handleViewMemoryDetail}
              onToggleFavorite={handleToggleFavorite}
              onGoToHome={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'recent' && (
            <RecentView
              memories={memories}
              onLocateOnMap={handleLocateOnMap}
              onViewDetails={handleViewMemoryDetail}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* DEDICATED FULL-PAGE MEMORY VAULT VIEW */}
          {activeTab === 'memory-detail' && detailMemory && (
            <MemoryDetailPage
              memory={detailMemory}
              onBack={() => setActiveTab(previousTab || 'home')}
              onLocateOnMap={handleLocateOnMap}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </main>
      </div>

      {/* MODALS */}
      {/* Create Pin Modal with Direct Map Picker & Media / Collaborators Support */}
      <CreateMemoryModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsPickingLocationOnMap(false);
        }}
        onCreate={handleCreatePin}
        onStartMapPick={handleStartMapPick}
        selectedMapCoords={pickedLocation}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetData={handleResetData}
      />
    </div>
  );
};
