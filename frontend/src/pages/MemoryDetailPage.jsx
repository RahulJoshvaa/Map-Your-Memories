import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Video, 
  Music, 
  FileText,
  Star, 
  Users, 
  Navigation, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Volume2, 
  Clock,
  Sparkles,
  Upload,
  AlertTriangle,
  Download
} from 'lucide-react';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { 
  uploadMediaToPin, 
  deleteMediaItem, 
  fetchPinMedia, 
  deleteMemoryPin,
  addPinCollaborator,
  removePinCollaborator,
  fetchPinById
} from '../services/memoryService';
import { API_BASE_URL } from '../services/api/client';
import { authService } from '../services/auth/authService';

export const MemoryDetailPage = ({
  memory,
  onBack,
  onLocateOnMap,
  onToggleFavorite,
  onPinDeleted,
  onPinUpdated,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);

  const [activeMediaTab, setActiveMediaTab] = useState('all'); // 'all' | 'photos' | 'videos' | 'audio' | 'documents'
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(null);
  const [mediaList, setMediaList] = useState(memory.media || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Delete Media Confirm State
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  // Delete Pin Confirm State
  const [showDeletePinConfirm, setShowDeletePinConfirm] = useState(false);
  const [isDeletingPin, setIsDeletingPin] = useState(false);

  // Collaborators
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [collaboratorsList, setCollaboratorsList] = useState(
    memory.collaborators || [
      { name: memory.owner?.name || 'Owner', role: 'Owner' }
    ]
  );
  const [collaboratorSuccess, setCollaboratorSuccess] = useState('');

  // Fetch fresh media list on mount
  useEffect(() => {
    async function loadFreshMedia() {
      if (!memory?.id) return;
      try {
        const freshMedia = await fetchPinMedia(memory.id);
        setMediaList(freshMedia || []);
      } catch (err) {
        console.warn('Could not refresh pin media:', err);
      }
    }
    loadFreshMedia();
  }, [memory?.id]);

  if (!memory) return null;

  // ─── Permission Gates ───────────────────────────────────────────────────────
  // OWNER: full control | ADMIN: edit+upload, manage collaborators, no pin delete
  // EDITOR: upload photos only, delete own uploads | VIEWER: read-only
  // (The backend enforces the same rules; these only shape the UI.)
  const perm = (memory.permission || 'VIEWER').toUpperCase();
  const isOwner   = perm === 'OWNER';
  const isAdmin   = perm === 'ADMIN'  || isOwner;
  const isEditor  = perm === 'EDITOR' || isAdmin;
  const photosOnly = perm === 'EDITOR';
  const currentUserId = authService.getCachedUser()?.id;
  const canDeletePin        = isOwner;            // Only owner can delete the whole pin
  const canEditDetails      = isAdmin;            // Owner + Admin can edit pin details
  const canUploadMedia      = isEditor;           // Owner + Admin + Editor (photos only) can upload
  const canDeleteMedia = (item) =>                // Owner + Admin: any; Editor: own uploads
    isAdmin || (photosOnly && item.uploaded_by === currentUserId);
  const canManageCollabs    = isAdmin;            // Owner + Admin can add/remove collaborators

  // Filter media based on tab
  const filteredMedia = mediaList.filter((item) => {
    const type = item.file_type;
    if (activeMediaTab === 'photos') return type === 'image' || type === 'photo';
    if (activeMediaTab === 'videos') return type === 'video';
    if (activeMediaTab === 'audio') return type === 'audio';
    if (activeMediaTab === 'documents') return type === 'document';
    return true;
  });

  // Handle uploading media to this pin
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photosOnly && files.some((f) => !f.type.startsWith('image/'))) {
      setUploadError('As an editor you can upload photos only.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      for (const file of files) {
        await uploadMediaToPin(memory.id, file);
      }
      const updatedList = await fetchPinMedia(memory.id);
      setMediaList(updatedList);
      if (onPinUpdated) {
        onPinUpdated(memory.id);
      }
    } catch (err) {
      setUploadError(err?.message || 'Failed to upload media. Check file size/type.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm delete individual media
  const handleConfirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    setIsDeletingMedia(true);
    try {
      await deleteMediaItem(mediaToDelete.id);
      setMediaList((prev) => prev.filter((m) => m.id !== mediaToDelete.id));
      setMediaToDelete(null);
      if (onPinUpdated) {
        onPinUpdated(memory.id);
      }
    } catch (err) {
      alert(`Delete failed: ${err?.message || 'Error deleting media'}`);
    } finally {
      setIsDeletingMedia(false);
    }
  };

  // Confirm delete entire pin
  const handleConfirmDeletePin = async () => {
    setIsDeletingPin(true);
    try {
      await deleteMemoryPin(memory.id);
      setShowDeletePinConfirm(false);
      if (onPinDeleted) {
        onPinDeleted(memory.id);
      } else {
        onBack();
      }
    } catch (err) {
      alert(`Failed to delete pin: ${err?.message || 'Server error'}`);
      setIsDeletingPin(false);
    }
  };

  const [collaboratorError, setCollaboratorError] = useState('');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollaboratorEmail.trim()) return;
    setIsAddingCollaborator(true);
    setCollaboratorError('');
    setCollaboratorSuccess('');

    try {
      await addPinCollaborator(memory.id, newCollaboratorEmail.trim());
      // Refresh memory to fetch updated collaborators from backend
      const updated = await fetchPinById(memory.id);
      if (updated?.collaborators) {
        setCollaboratorsList(updated.collaborators);
      }
      setCollaboratorSuccess(`Invitation sent to ${newCollaboratorEmail}. They'll get access once they accept.`);
      setNewCollaboratorEmail('');
      if (onPinUpdated) {
        onPinUpdated(memory.id);
      }
    } catch (err) {
      setCollaboratorError(err?.message || 'Failed to add collaborator. Ensure user exists.');
    } finally {
      setIsAddingCollaborator(false);
      setTimeout(() => setCollaboratorSuccess(''), 4000);
    }
  };

  const handleRemoveCollaborator = async (collab) => {
    if (!collab.userId && !collab.id) return;
    try {
      await removePinCollaborator(memory.id, collab.userId || collab.id);
      setCollaboratorsList((prev) => prev.filter((c) => c !== collab));
      if (onPinUpdated) {
        onPinUpdated(memory.id);
      }
    } catch (err) {
      alert(err?.message || 'Failed to remove collaborator');
    }
  };

  const toggleAudio = (id) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
    }
  };

  const getMediaUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    // Normalize Windows backslashes to forward slashes
    const normalized = filePath.replace(/\\/g, '/');
    const pathWithUploads = normalized.startsWith('/uploads/') 
      ? normalized 
      : normalized.startsWith('uploads/') 
        ? `/${normalized}` 
        : `/uploads/${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
    return `${API_BASE_URL}${pathWithUploads}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
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

          {/* Delete Pin Action — OWNER only */}
          {canDeletePin && (
            <button
              type="button"
              onClick={() => setShowDeletePinConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-[#1a2c35] bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/60 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Pin</span>
            </button>
          )}
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
              {memory.description || 'No additional narrative recorded.'}
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
                {(memory.owner?.name || 'O').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs truncate">
                  {memory.owner?.name || 'Owner'}
                </div>
                <div className="text-[11px] opacity-60 truncate">
                  {memory.owner?.email || ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Media Vault & Collaborators */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Media Vault */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-chunky font-bold text-lg sm:text-xl flex items-center gap-2">
              <span>Attached Media Vault</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35]">
                {mediaList.length} Files
              </span>
            </h2>

            {/* Filter Tabs & Add Media button */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1">
                {[
                  { id: 'all', label: 'All', icon: Sparkles },
                  { id: 'photos', label: 'Photos', icon: ImageIcon },
                  { id: 'videos', label: 'Videos', icon: Video },
                  { id: 'audio', label: 'Audio', icon: Music },
                  { id: 'documents', label: 'Docs', icon: FileText },
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

              {/* Add Media Action Button — EDITOR+ only */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={photosOnly ? 'image/*' : undefined}
                onChange={handleFileUpload}
                className="hidden"
              />
              {canUploadMedia ? (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-3d-yellow font-semibold text-xs tracking-wider uppercase cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 stroke-2.5" />
                  <span>{isUploading ? 'Uploading...' : photosOnly ? 'Add Photos' : 'Add Media'}</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg border border-[#1a2c35]/30 text-[10px] font-medium opacity-60">
                  View Only
                </span>
              )}
            </div>
          </div>

          {/* Upload error notice */}
          {uploadError && (
            <div className="p-3 rounded-xl border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
              <span>{uploadError}</span>
              <button type="button" onClick={() => setUploadError('')} className="p-1">
                ✕
              </button>
            </div>
          )}

          {/* Clean Empty State or Media Grid */}
          {filteredMedia.length === 0 ? (
            <div className={`p-8 rounded-2xl border-2 border-[#1a2c35] text-center
              ${
                isDark
                  ? 'bg-[#0d292e] shadow-[0_4px_0_0_#041a1d]'
                  : 'bg-white shadow-[0_4px_0_0_#e2d7c5]'
              }
            `}>
              <div className="w-12 h-12 rounded-2xl bg-[#ffb72b]/20 border border-[#1a2c35] flex items-center justify-center mx-auto mb-3 text-[#1a2c35] dark:text-[#ffb72b]">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-normal opacity-70 mb-3">
                No media uploaded yet.
              </p>
              {canUploadMedia && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="px-4 py-2 rounded-xl btn-3d-yellow text-xs font-semibold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-2" />
                  <span>{photosOnly ? 'Upload Photos' : 'Upload Media'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMedia.map((item) => {
                const isImg = item.file_type === 'image' || item.file_type === 'photo';
                const isVid = item.file_type === 'video';
                const isAud = item.file_type === 'audio';
                const isDoc = item.file_type === 'document';
                const mediaUrl = getMediaUrl(item.url || item.file_path);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border-2 border-[#1a2c35] p-3.5 flex flex-col justify-between transition-transform hover:-translate-y-0.5 relative group
                      ${
                        isDark
                          ? 'bg-[#0d292e] text-white shadow-[0_3px_0_0_#041a1d]'
                          : 'bg-white text-[#1a2c35] shadow-[0_3px_0_0_#cbd5e1]'
                      }
                    `}
                  >
                    {/* Delete media icon button — ADMIN+ any file, EDITOR own uploads */}
                    {canDeleteMedia(item) && (
                      <button
                        type="button"
                        title="Delete media file"
                        onClick={() => setMediaToDelete(item)}
                        className="absolute top-2 right-2 z-20 p-1.5 rounded-lg border border-[#1a2c35] bg-white dark:bg-[#0a2327] hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-rose-500 transition-colors shadow-xs cursor-pointer opacity-80 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Image Preview Box */}
                    {isImg && (
                      <div>
                        <div 
                          onClick={() => setSelectedMediaPreview({ ...item, url: mediaUrl })}
                          className="h-44 rounded-xl border border-[#1a2c35] overflow-hidden relative cursor-pointer group bg-neutral-900"
                        >
                          <img
                            src={mediaUrl}
                            alt={item.file_name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#1a2c35]/80 text-white backdrop-blur-xs">
                            {formatFileSize(item.file_size)}
                          </span>
                        </div>
                        <div className="pt-2.5 pr-8">
                          <div className="font-semibold text-xs sm:text-sm truncate">
                            {item.file_name}
                          </div>
                          <p className="text-[11px] opacity-70 leading-snug line-clamp-1 mt-0.5">
                            Uploaded image attachment
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Video Box */}
                    {isVid && (
                      <div>
                        <div className="h-44 rounded-xl border border-[#1a2c35] overflow-hidden relative bg-black flex items-center justify-center">
                          <video
                            src={mediaUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="pt-2.5 pr-8">
                          <div className="font-semibold text-xs sm:text-sm truncate">
                            {item.file_name}
                          </div>
                          <span className="text-[10px] opacity-60">
                            {formatFileSize(item.file_size)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Audio Box */}
                    {isAud && (
                      <div className="flex flex-col justify-between h-full space-y-3 pt-4">
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

                          <div className="min-w-0 flex-1 pr-6">
                            <div className="font-semibold text-xs sm:text-sm truncate">
                              {item.file_name}
                            </div>
                            <div className="text-[11px] opacity-60 flex items-center gap-1.5 mt-0.5">
                              <Volume2 className="w-3 h-3 text-[#02a896]" />
                              <span>{formatFileSize(item.file_size)}</span>
                            </div>
                          </div>
                        </div>

                        {playingAudioId === item.id && (
                          <div className="space-y-2 animate-fadeIn">
                            <audio src={mediaUrl} autoPlay controls className="w-full h-8" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Document Box */}
                    {isDoc && (
                      <div className="flex flex-col justify-between h-full space-y-3 pt-4">
                        <div className={`p-4 rounded-xl border border-[#1a2c35]/30 flex items-center gap-3
                          ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf6ee]'}
                        `}>
                          <div className="w-10 h-10 rounded-xl bg-[#ffb72b] text-[#1a2c35] border-2 border-[#1a2c35] flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1 pr-6">
                            <div className="font-semibold text-xs sm:text-sm truncate">
                              {item.file_name}
                            </div>
                            <div className="text-[11px] opacity-60">
                              {formatFileSize(item.file_size)}
                            </div>
                          </div>
                        </div>

                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={item.file_name}
                          className="w-full py-2 px-3 rounded-xl border border-[#1a2c35] btn-3d-white text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download / Open Document</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
              Friends with shared access can view photos, notes, and clips attached to this pin.
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
                      {(collab.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate">
                        {collab.name}
                      </div>
                      {collab.email && (
                        <div className="text-[10px] opacity-60 truncate">
                          {collab.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {collab.status === 'pending' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#ffb72b] text-[#b37a00] dark:text-[#ffb72b]">
                        Pending
                      </span>
                    )}
                    {collab.status === 'rejected' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-rose-400 text-rose-500">
                        Declined
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#1a2c35]/30 bg-white text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-200">
                      {collab.role}
                    </span>
                    {/* Remove button — ADMIN+ only, cannot remove Owner */}
                    {canManageCollabs && collab.role !== 'Owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(collab)}
                        className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                        title="Remove collaborator"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Collaborator Form — ADMIN+ only */}
            {canManageCollabs ? (
              <form onSubmit={handleAddCollaborator} className="space-y-2 pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
                <label className="text-xs font-semibold block">
                  Add Collaborator
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    required
                    placeholder="friend@email.com"
                    value={newCollaboratorEmail}
                    onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                    disabled={isAddingCollaborator}
                    className={`flex-1 py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs outline-none
                      ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
                  />
                  <button
                    type="submit"
                    disabled={isAddingCollaborator}
                    className="px-3 py-2 rounded-xl btn-3d-yellow text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isAddingCollaborator ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#1a2c35] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-2.5" />
                    )}
                  </button>
                </div>

                {collaboratorError && (
                  <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400 animate-fadeIn">
                    {collaboratorError}
                  </p>
                )}

                {collaboratorSuccess && (
                  <p className="text-[11px] font-medium text-[#02a896] dark:text-[#ffb72b] animate-fadeIn">
                    {collaboratorSuccess}
                  </p>
                )}
              </form>
            ) : (
              <div className="pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
                <p className="text-[11px] opacity-50 font-medium flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Only the owner or admin can manage collaborators.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Delete Individual Media */}
      {mediaToDelete && (
        <div 
          onClick={() => setMediaToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`max-w-md w-full rounded-2xl border-3 border-[#1a2c35] p-5 space-y-4
              ${isDark ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d]' : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1]'}`}
          >
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 stroke-2.5" />
              <h3 className="font-chunky font-bold text-base">Delete Media File</h3>
            </div>

            <p className="text-xs sm:text-sm font-normal opacity-85">
              Are you sure you want to delete <span className="font-semibold underline">{mediaToDelete.file_name}</span>? The physical file will be removed from storage permanently.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
              <button
                type="button"
                onClick={() => setMediaToDelete(null)}
                className="px-4 py-2 rounded-xl border-2 border-[#1a2c35] btn-3d-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingMedia}
                onClick={handleConfirmDeleteMedia}
                className="px-4 py-2 rounded-xl border-2 border-[#1a2c35] bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                {isDeletingMedia ? 'Deleting...' : 'Delete File'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Entire Pin */}
      {showDeletePinConfirm && (
        <div 
          onClick={() => setShowDeletePinConfirm(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`max-w-md w-full rounded-2xl border-3 border-[#1a2c35] p-5 space-y-4
              ${isDark ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d]' : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1]'}`}
          >
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 stroke-2.5" />
              <h3 className="font-chunky font-bold text-base">Delete Entire Pin</h3>
            </div>

            <p className="text-xs sm:text-sm font-normal opacity-85">
              Warning: This will permanently delete <span className="font-semibold underline">{memory.title}</span> and all its {mediaList.length} attached media files from the database and local storage.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
              <button
                type="button"
                onClick={() => setShowDeletePinConfirm(false)}
                className="px-4 py-2 rounded-xl border-2 border-[#1a2c35] btn-3d-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPin}
                onClick={handleConfirmDeletePin}
                className="px-4 py-2 rounded-xl border-2 border-[#1a2c35] bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                {isDeletingPin ? 'Deleting Pin...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo Preview */}
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
              <h4 className="font-chunky font-bold text-base truncate">{selectedMediaPreview.file_name}</h4>
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
                src={selectedMediaPreview.url}
                alt={selectedMediaPreview.file_name}
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>

            <p className="text-xs text-neutral-300">
              {selectedMediaPreview.file_name} ({formatFileSize(selectedMediaPreview.file_size)})
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
