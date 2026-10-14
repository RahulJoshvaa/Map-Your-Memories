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
import { MapPin, Check } from 'lucide-react';
import { 
  fetchMemories, 
  filterMemoriesByQuery, 
  createMemory, 
  toggleFavoriteMemory, 
  fetchPinById,
  getMyPins,
  getSharedWithMe,
  getFavoriteMemories
} from '../services/memoryService';

export const Dashboard = ({ currentUser, onSignOut }) => {
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
  const [pendingLocationPrompt, setPendingLocationPrompt] = useState(null);
  const [promptLocationName, setPromptLocationName] = useState('');

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
    if (created) {
      handleLocateOnMap(created);
    }
  };

  const handlePinDeleted = async (pinId) => {
    setMemories((prev) => prev.filter((m) => m.id !== pinId));
    setSelectedMemory(null);
    setSelectedCluster(null);
    setDetailMemory(null);
    setActiveTab(previousTab || 'home');
    await loadData();
  };

  const handlePinUpdated = async (pinId) => {
    try {
      const refreshed = await fetchPinById(pinId);
      if (refreshed) {
        setMemories((prev) => prev.map((m) => (m.id === pinId ? refreshed : m)));
        if (detailMemory && detailMemory.id === pinId) {
          setDetailMemory(refreshed);
        }
      }
    } catch {
      await loadData();
    }
  };

  // Location Picker Flow: User clicks "Select on Map" in Create Pin modal
  const handleStartMapPick = () => {
    setIsCreateOpen(false);
    setActiveTab('home');
    setIsPickingLocationOnMap(true);
  };

  // User clicked on map -> prompt for location name before returning to CreatePinModal
  const handleLocationPicked = (coords) => {
    setIsPickingLocationOnMap(false);
    setPendingLocationPrompt(coords);
    setPromptLocationName('');
  };

  const handleConfirmLocationName = (e) => {
    e.preventDefault();
    if (!pendingLocationPrompt) return;
    const finalLocation = {
      ...pendingLocationPrompt,
      name: promptLocationName.trim() || `Location (${pendingLocationPrompt.lat}, ${pendingLocationPrompt.lng})`,
    };
    setPickedLocation(finalLocation);
    setPendingLocationPrompt(null);
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
        user={currentUser}
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
          user={currentUser}
          onInviteResponded={loadData}
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
              onPinDeleted={handlePinDeleted}
              onPinUpdated={handlePinUpdated}
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
        user={currentUser}
      />

      {/* Prompt Dialog: Ask for Location Name immediately after selecting on map */}
      {pendingLocationPrompt && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062024]/75 backdrop-blur-xs animate-fadeIn select-none"
          onClick={() => {
            handleConfirmLocationName({ preventDefault: () => {} });
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-2xl border-3 border-[#1a2c35] p-5 sm:p-6 transition-all
              ${
                isDark
                  ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d,0_8px_0_3px_#1a2c35]'
                  : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#a35d10,0_8px_0_3px_#1a2c35]'
              }
            `}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#02a896] text-white border-2 border-[#1a2c35] flex items-center justify-center">
                <MapPin className="w-4 h-4 fill-current" />
              </div>
              <h3 className="text-lg font-black font-chunky uppercase tracking-tight">
                Name This Location
              </h3>
            </div>

            <p className="text-xs opacity-70 mb-4">
              Enter a recognizable landmark or location name for coordinates{' '}
              <span className="font-mono font-bold">
                ({pendingLocationPrompt.lat}, {pendingLocationPrompt.lng})
              </span>
            </p>

            <form onSubmit={handleConfirmLocationName} className="space-y-4">
              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Fort Kochi Promenade, Ooty Tea Garden"
                  value={promptLocationName}
                  onChange={(e) => setPromptLocationName(e.target.value)}
                  className={`w-full py-2.5 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs sm:text-sm outline-none transition-all
                    ${
                      isDark
                        ? 'bg-[#0a2327] text-white focus:border-[#ffb72b]'
                        : 'bg-[#faf8f5] text-[#1a2c35] focus:border-[#02a896]'
                    }
                  `}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingLocationPrompt(null);
                    setIsCreateOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border-2 border-[#1a2c35] text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-[#0a2327] cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl btn-3d-yellow text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-2.5" />
                  <span>Set Location Name</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
