import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Image, 
  Video, 
  Music, 
  Star, 
  Users, 
  Navigation, 
  Play, 
  Pause, 
  Download, 
  Plus, 
  Share2, 
  Volume2, 
  Clock,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';

export const MemoryDetailPage = ({
  memory,
  onBack,
  onLocateOnMap,
  onToggleFavorite,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeMediaTab, setActiveMediaTab] = useState('all'); // 'all' | 'photos' | 'videos' | 'audio'
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [collaboratorsList, setCollaboratorsList] = useState(
    memory.collaborators || [
      { name: memory.owner?.name || 'Rahul Verma', role: 'Owner' },
      { name: 'Arjun Nair', role: 'Editor' },
      { name: 'Priya Sharma', role: 'Viewer' }
    ]
  );
  const [collaboratorSuccess, setCollaboratorSuccess] = useState('');

  if (!memory) return null;

  // Rich mock media gallery for this memory
  const mediaGallery = memory.gallery || [
    {
      id: 'img-1',
      type: 'photo',
      title: 'Sunrise Panorama',
      caption: 'The morning mist lifting over the hills',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      timestamp: '06:15 AM',
      size: '4.2 MB',
    },
    {
      id: 'img-2',
      type: 'photo',
      title: 'Botanical Garden Flowers',
      caption: 'Vibrant blossoms captured along the walking trail',
      url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
      timestamp: '09:40 AM',
      size: '3.8 MB',
    },
    {
      id: 'img-3',
      type: 'photo',
      title: 'Local Cafe & Pastries',
      caption: 'Homemade chocolate fudge and steaming filter coffee',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      timestamp: '12:30 PM',
      size: '5.1 MB',
    },
    {
      id: 'img-4',
      type: 'photo',
      title: 'Tea Estate Walkway',
      caption: 'Wandering through the emerald tea terraces',
      url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
      timestamp: '04:15 PM',
      size: '6.4 MB',
    },
    {
      id: 'vid-1',
      type: 'video',
      title: 'Mountain Train Journey',
      caption: 'Steam engine chugging through the mountain curves',
      duration: '0:45',
      thumbnail: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&auto=format&fit=crop&q=80',
      size: '24.6 MB',
    },
    {
      id: 'vid-2',
      type: 'video',
      title: 'Sunset Drone Footage',
      caption: '360 degree aerial orbit as twilight settles',
      duration: '1:12',
      thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80',
      size: '48.1 MB',
    },
    {
      id: 'aud-1',
      type: 'audio',
      title: 'Forest Birds & Breeze Soundscape',
      caption: 'Ambient morning audio recorded with field mic',
      duration: '2:14',
      size: '3.2 MB',
    },
    {
      id: 'aud-2',
      type: 'audio',
      title: 'Campfire Acoustic Guitar Jam',
      caption: 'Unplugged guitar chords around the evening campfire',
      duration: '3:05',
      size: '4.8 MB',
    },
  ];

  const filteredMedia = mediaGallery.filter((item) => {
    if (activeMediaTab === 'photos') return item.type === 'photo';
    if (activeMediaTab === 'videos') return item.type === 'video';
    if (activeMediaTab === 'audio') return item.type === 'audio';
    return true;
  });

  const handleAddCollaborator = (e) => {
    e.preventDefault();
    if (!newCollaboratorEmail.trim()) return;
    const name = newCollaboratorEmail.split('@')[0];
    setCollaboratorsList((prev) => [
      ...prev,
      { name: name.charAt(0).toUpperCase() + name.slice(1), role: 'Editor' }
    ]);
    setCollaboratorSuccess(`Added ${newCollaboratorEmail} as Collaborator!`);
    setNewCollaboratorEmail('');
    setTimeout(() => setCollaboratorSuccess(''), 3000);
  };

  const toggleAudio = (id) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
    }
  };

  const formattedDate = new Date(memory.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-page-enter">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-[#1a2c35] btn-3d-white text-xs font-semibold cursor-pointer transition-transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 stroke-2" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(memory.id)}
              aria-label={memory.isFavorite ? 'Unfavorite' : 'Favorite'}
              className={`p-2 rounded-xl border-2 border-[#1a2c35] transition-all cursor-pointer
                ${
                  memory.isFavorite
                    ? 'bg-[#ffb72b] text-[#1a2c35] shadow-[0_2px_0_0_#a35d10]'
                    : 'btn-3d-white text-[#1a2c35]'
                }
              `}
            >
              <Star className={`w-4 h-4 ${memory.isFavorite ? 'fill-[#1a2c35]' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onLocateOnMap(memory)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-[#1a2c35] btn-3d-teal text-xs font-semibold cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Locate on Map</span>
          </button>
        </div>
      </div>

      {/* Memory Hero Banner Card */}
      <div className={`rounded-2xl border-3 border-[#1a2c35] p-6 transition-all
        ${
          isDark
            ? 'bg-[#0d292e] text-white shadow-[0_6px_0_0_#041a1d,0_6px_0_3px_#1a2c35]'
            : 'bg-white text-[#1a2c35] shadow-[0_6px_0_0_#cbd5e1,0_6px_0_3px_#1a2c35]'
        }
      `}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35]">
                {memory.permission || 'OWNER'}
              </span>

              <span className="text-xs font-medium opacity-75 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#02a896] dark:text-[#ffb72b]" />
                {memory.locationName}
              </span>

              <span className="text-xs opacity-50">
                ({memory.latitude?.toFixed(4)}, {memory.longitude?.toFixed(4)})
              </span>
            </div>

            <h1 className="font-chunky font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight">
              {memory.title}
            </h1>

            <div className="flex items-center gap-2 text-xs opacity-65">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{memory.lastAccessed || 'Recently updated'}</span>
            </div>

            <p className="text-sm font-normal leading-relaxed pt-2 opacity-90">
              {memory.description}
            </p>

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {memory.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-medium border border-[#1a2c35]/25 bg-neutral-100 text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Memory Owner Card */}
          <div className={`p-4 rounded-xl border-2 border-[#1a2c35] space-y-2 shrink-0 sm:w-64
            ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
          `}>
            <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block">
              Memory Creator
            </span>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#02a896] border-2 border-[#1a2c35] text-white flex items-center justify-center font-bold text-sm">
                {(memory.owner?.name || 'R').charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs truncate">
                  {memory.owner?.name || 'Rahul Verma'}
                </div>
                <div className="text-[11px] opacity-60 truncate">
                  {memory.owner?.email || 'rahul@memories.map'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Media Vault & Collaborators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Media Vault (Photos, Videos, Audio Soundscapes) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-chunky font-bold text-lg sm:text-xl flex items-center gap-2">
              <span>Attached Media Vault</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35]">
                {mediaGallery.length} Files
              </span>
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Media', icon: Sparkles },
                { id: 'photos', label: 'Photos', icon: Image },
                { id: 'videos', label: 'Videos', icon: Video },
                { id: 'audio', label: 'Audio', icon: Music },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMediaTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMediaTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border border-[#1a2c35] flex items-center gap-1 transition-all cursor-pointer
                      ${
                        isActive
                          ? 'bg-[#ffb72b] text-[#1a2c35] shadow-[0_2px_0_0_#a35d10]'
                          : isDark
                          ? 'bg-[#0d292e] text-neutral-300 hover:bg-[#0f343a]'
                          : 'bg-white text-[#1a2c35] hover:bg-[#fffae8]'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-2" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border-2 border-[#1a2c35] p-3.5 flex flex-col justify-between transition-transform hover:-translate-y-0.5
                  ${
                    isDark
                      ? 'bg-[#0d292e] text-white shadow-[0_3px_0_0_#041a1d]'
                      : 'bg-white text-[#1a2c35] shadow-[0_3px_0_0_#cbd5e1]'
                  }
                `}
              >
                {/* Media Preview Box */}
                {item.type === 'photo' && (
                  <div>
                    <div 
                      onClick={() => setSelectedMediaPreview(item)}
                      className="h-44 rounded-xl border border-[#1a2c35] overflow-hidden relative cursor-pointer group"
                    >
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#1a2c35]/80 text-white backdrop-blur-xs">
                        {item.size}
                      </span>
                    </div>
                    <div className="pt-2.5">
                      <div className="font-semibold text-xs sm:text-sm truncate">
                        {item.title}
                      </div>
                      <p className="text-[11px] opacity-70 leading-snug line-clamp-1 mt-0.5">
                        {item.caption}
                      </p>
                    </div>
                  </div>
                )}

                {item.type === 'video' && (
                  <div>
                    <div 
                      onClick={() => setSelectedMediaPreview(item)}
                      className="h-44 rounded-xl border border-[#1a2c35] overflow-hidden relative cursor-pointer group"
                    >
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-[#ffb72b] border-2 border-[#1a2c35] flex items-center justify-center text-[#1a2c35] shadow-md group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#1a2c35]/80 text-white backdrop-blur-xs">
                        {item.duration} • {item.size}
                      </span>
                    </div>
                    <div className="pt-2.5">
                      <div className="font-semibold text-xs sm:text-sm truncate">
                        {item.title}
                      </div>
                      <p className="text-[11px] opacity-70 leading-snug line-clamp-1 mt-0.5">
                        {item.caption}
                      </p>
                    </div>
                  </div>
                )}

                {item.type === 'audio' && (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className={`p-4 rounded-xl border border-[#1a2c35]/30 flex items-center gap-3
                      ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
                    `}>
                      <button
                        type="button"
                        onClick={() => toggleAudio(item.id)}
                        className="w-10 h-10 rounded-full bg-[#02a896] text-white border-2 border-[#1a2c35] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shrink-0"
                      >
                        {playingAudioId === item.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs sm:text-sm truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] opacity-60 flex items-center gap-1.5 mt-0.5">
                          <Volume2 className="w-3 h-3 text-[#02a896]" />
                          <span>{item.duration}</span>
                          <span>•</span>
                          <span>{item.size}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] opacity-75 leading-relaxed">
                      {item.caption}
                    </p>

                    {playingAudioId === item.id && (
                      <div className="p-2 rounded-lg bg-[#02a896]/15 text-[#02a896] dark:text-[#ffb72b] text-[11px] font-medium flex items-center gap-2 animate-fadeIn">
                        <span className="w-2 h-2 rounded-full bg-[#02a896] animate-ping" />
                        <span>Playing audio soundscape preview...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Collaborators & Sharing Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`rounded-2xl border-2.5 border-[#1a2c35] p-5
            ${
              isDark
                ? 'bg-[#0d292e] text-white shadow-[0_4px_0_0_#041a1d]'
                : 'bg-white text-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1]'
            }
          `}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#02a896] dark:text-[#ffb72b]" />
              <h3 className="font-chunky font-bold text-base">
                Collaborators ({collaboratorsList.length})
              </h3>
            </div>

            <p className="text-xs font-normal opacity-70 mb-3">
              Friends with shared access can view and contribute photos, notes, and clips to this pin.
            </p>

            {/* Collaborators List */}
            <div className="space-y-2 mb-4">
              {collaboratorsList.map((collab, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border border-[#1a2c35]/25 flex items-center justify-between gap-2
                    ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#ffb72b] text-[#1a2c35] border border-[#1a2c35] flex items-center justify-center font-bold text-xs shrink-0">
                      {collab.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate">
                        {collab.name}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#1a2c35]/30 bg-white text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-200 shrink-0">
                    {collab.role}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Collaborator Form */}
            <form onSubmit={handleAddCollaborator} className="space-y-2 pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
              <label className="text-xs font-semibold block">
                Add New Collaborator
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  placeholder="friend@email.com"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs outline-none
                    ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl btn-3d-yellow text-xs font-semibold cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-2.5" />
                </button>
              </div>

              {collaboratorSuccess && (
                <p className="text-[11px] font-medium text-[#02a896] dark:text-[#ffb72b] animate-fadeIn">
                  {collaboratorSuccess}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for Photo / Video Preview */}
      {selectedMediaPreview && (
        <div 
          onClick={() => setSelectedMediaPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full rounded-2xl border-3 border-[#1a2c35] bg-[#0d292e] text-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-chunky font-bold text-base">{selectedMediaPreview.title}</h4>
              <button
                type="button"
                onClick={() => setSelectedMediaPreview(null)}
                className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden max-h-96 flex items-center justify-center bg-black">
              <img
                src={selectedMediaPreview.url || selectedMediaPreview.thumbnail}
                alt={selectedMediaPreview.title}
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>

            <p className="text-xs text-neutral-300">
              {selectedMediaPreview.caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
