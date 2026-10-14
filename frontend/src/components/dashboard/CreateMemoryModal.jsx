import React, { useState, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Tag, 
  Upload, 
  File, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Users, 
  Plus, 
  MousePointerClick, 
  Trash2 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const CreateMemoryModal = ({
  isOpen,
  onClose,
  onCreate,
  onStartMapPick,
  selectedMapCoords = null,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(
    selectedMapCoords ? `Pin (${selectedMapCoords.lat}, ${selectedMapCoords.lng})` : 'Ooty, Tamil Nadu'
  );
  const [latitude, setLatitude] = useState(selectedMapCoords ? selectedMapCoords.lat.toString() : '11.4102');
  const [longitude, setLongitude] = useState(selectedMapCoords ? selectedMapCoords.lng.toString() : '76.6950');
  
  // Date range state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('Travel, Vacation');
  
  // Universal Upload Files state (Any type: image, video, audio, documents, etc.)
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: 'f-1', name: 'sunset_over_hills.jpg', type: 'image', size: '3.4 MB' },
    { id: 'f-2', name: 'nilgiri_toy_train.mov', type: 'video', size: '14.2 MB' },
    { id: 'f-3', name: 'steam_whistle_audio.mp3', type: 'audio', size: '2.1 MB' },
  ]);

  // Collaborators state
  const [collaborators, setCollaborators] = useState(['arjun@travel.io']);
  const [collaboratorInput, setCollaboratorInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Synchronize when coordinates are picked from the map
  React.useEffect(() => {
    if (selectedMapCoords) {
      setLatitude(selectedMapCoords.lat.toString());
      setLongitude(selectedMapCoords.lng.toString());
      setLocationName(`Location (${selectedMapCoords.lat}, ${selectedMapCoords.lng})`);
    }
  }, [selectedMapCoords]);

  if (!isOpen) return null;

  // Handle native file upload of anything (images, videos, audio, pdf, etc.)
  const handleNativeFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newEntries = files.map((file) => {
      let detectedType = 'file';
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type.startsWith('video/')) detectedType = 'video';
      else if (file.type.startsWith('audio/')) detectedType = 'audio';

      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      return {
        id: `f-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: detectedType,
        size: formattedSize,
      };
    });

    setUploadedFiles((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAddCollaborator = (e) => {
    e.preventDefault();
    if (!collaboratorInput.trim()) return;
    if (!collaborators.includes(collaboratorInput.trim())) {
      setCollaborators((prev) => [...prev, collaboratorInput.trim()]);
    }
    setCollaboratorInput('');
  };

  const handleRemoveCollaborator = (email) => {
    setCollaborators((prev) => prev.filter((c) => c !== email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for your pin');
      return;
    }
    if (!latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      setError('Please choose a location on the map');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const photosCount = uploadedFiles.filter((f) => f.type === 'image').length || 1;
      const videosCount = uploadedFiles.filter((f) => f.type === 'video').length || 0;
      const audioCount = uploadedFiles.filter((f) => f.type === 'audio').length || 0;

      const displayDate = startDate === endDate 
        ? startDate 
        : `${startDate} to ${endDate}`;

      await onCreate({
        title,
        description,
        locationName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        date: startDate,
        dateRange: displayDate,
        tags,
        collaborators: [
          { name: 'Rahul Verma', role: 'Owner' },
          ...collaborators.map((c) => ({ name: c.split('@')[0], role: 'Editor' }))
        ],
        mediaCount: {
          photos: photosCount,
          videos: videosCount,
          audios: audioCount,
        },
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create pin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#062024]/75 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-create-pin-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl my-8 rounded-2xl border-3 border-[#1a2c35] p-5 sm:p-6 transition-all
          ${
            isDark
              ? 'bg-[#0d292e] text-white shadow-[0_8px_0_0_#041a1d,0_8px_0_3px_#1a2c35]'
              : 'bg-white text-[#1a2c35] shadow-[0_8px_0_0_#cbd5e1,0_8px_0_3px_#1a2c35]'
          }
        `}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1a2c35]/15 dark:border-[#1a2c35]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ffb72b] border-2 border-[#1a2c35] flex items-center justify-center text-[#1a2c35]">
              <MapPin className="w-4 h-4 stroke-2.5" />
            </div>
            <div>
              <h2 id="modal-create-pin-title" className="font-chunky font-bold text-lg leading-tight">
                Create Memory Pin
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl border-2 border-[#1a2c35] bg-white dark:bg-[#0a2327] hover:bg-rose-50 hover:border-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-all duration-150 cursor-pointer shadow-xs active:scale-90 text-[#1a2c35] dark:text-neutral-200"
          >
            <X className="w-4 h-4 stroke-2.5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-2.5 rounded-xl border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold block mb-1">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ooty Mountain Trail"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs sm:text-sm outline-none transition-all
                ${
                  isDark
                    ? 'bg-[#0a2327] text-white focus:border-[#ffb72b]'
                    : 'bg-[#faf8f5] text-[#1a2c35] focus:border-[#02a896]'
                }
              `}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold block mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Memories, quotes, sounds, atmosphere..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-normal text-xs sm:text-sm outline-none resize-none transition-all
                ${
                  isDark
                    ? 'bg-[#0a2327] text-white focus:border-[#ffb72b]'
                    : 'bg-[#faf8f5] text-[#1a2c35] focus:border-[#02a896]'
                }
              `}
            />
          </div>

          {/* Location Selection via Map */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold">
                Geographic Coordinates
              </label>
              <button
                type="button"
                onClick={onStartMapPick}
                className="text-[11px] font-semibold text-[#02a896] dark:text-[#ffb72b] flex items-center gap-1 hover:underline cursor-pointer"
              >
                <MousePointerClick className="w-3.5 h-3.5" />
                <span>Select on Map</span>
              </button>
            </div>

            <div className={`p-2.5 rounded-xl border-2 border-[#1a2c35] flex items-center justify-between gap-2
              ${isDark ? 'bg-[#0a2327]' : 'bg-[#faf8f5]'}
            `}>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  {locationName}
                </div>
                <div className="text-[10px] opacity-60">
                  {latitude}, {longitude}
                </div>
              </div>

              <button
                type="button"
                onClick={onStartMapPick}
                className="px-2.5 py-1 rounded-lg border border-[#1a2c35] text-xs font-medium bg-white text-[#1a2c35] hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
              >
                Pick on Map
              </button>
            </div>
          </div>

          {/* DATE RANGE (From Date → To Date) */}
          <div className="space-y-1.5 pt-1 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <label className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#02a896]" />
              <span>Date Range</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] opacity-60 block mb-0.5">Start Date</span>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate < e.target.value) setEndDate(e.target.value);
                  }}
                  className={`w-full py-1.5 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs outline-none
                    ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
                />
              </div>

              <div>
                <span className="text-[11px] opacity-60 block mb-0.5">End Date</span>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full py-1.5 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs outline-none
                    ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
                />
              </div>
            </div>
          </div>

          {/* UPLOAD ANYTHING (No restrictive dropdown - native file selector + drag/drop area) */}
          <div className="space-y-2 pt-1 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#02a896]" />
                <span>Upload Media & Files</span>
              </label>
              <span className="text-[10px] opacity-60 font-medium">
                {uploadedFiles.length} attached
              </span>
            </div>

            {/* Hidden Native File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleNativeFileUpload}
              className="hidden"
            />

            {/* Direct Click-to-Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className={`p-3.5 rounded-xl border-2 border-dashed border-[#1a2c35] text-center cursor-pointer transition-colors
                ${
                  isDark
                    ? 'bg-[#0a2327]/80 hover:bg-[#0a2327] hover:border-[#ffb72b]'
                    : 'bg-[#faf6ee] hover:bg-[#fff9ed] hover:border-[#02a896]'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2 mb-1 text-[#02a896] dark:text-[#ffb72b]">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-semibold">Choose files or drop anything here</span>
              </div>
              <p className="text-[10px] opacity-60">
                Supports images, videos, audio recordings, documents, and clips
              </p>
            </div>

            {/* Uploaded Files Chips */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`px-2.5 py-1 rounded-xl border border-[#1a2c35] flex items-center gap-1.5 text-xs font-medium
                      ${isDark ? 'bg-[#0a2327] text-neutral-200' : 'bg-white text-[#1a2c35]'}`}
                  >
                    {file.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-[#02a896]" />}
                    {file.type === 'video' && <Video className="w-3.5 h-3.5 text-rose-500" />}
                    {file.type === 'audio' && <Music className="w-3.5 h-3.5 text-[#ffb72b]" />}
                    {file.type === 'file' && <File className="w-3.5 h-3.5 text-sky-500" />}
                    <span className="truncate max-w-[130px]">{file.name}</span>
                    <span className="text-[10px] opacity-50">({file.size})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-0.5 hover:text-rose-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ADD COLLABORATORS */}
          <div className="space-y-2 pt-1 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ffb72b]" />
                <span>Add Collaborators</span>
              </label>
              <span className="text-[10px] opacity-60 font-medium">
                {collaborators.length} invited
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="friend@email.com"
                value={collaboratorInput}
                onChange={(e) => setCollaboratorInput(e.target.value)}
                className={`flex-1 py-1.5 px-3 rounded-xl border-2 border-[#1a2c35] text-xs font-normal outline-none
                  ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
              />
              <button
                type="button"
                onClick={handleAddCollaborator}
                className="px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35] hover:bg-[#ffc44d] text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Invite
              </button>
            </div>

            {/* Collaborators Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {collaborators.map((email) => (
                <div
                  key={email}
                  className="px-2.5 py-0.5 rounded-lg border border-[#1a2c35] bg-white dark:bg-[#062024] text-xs font-medium flex items-center gap-1.5"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCollaborator(email)}
                    className="hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="pt-1 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <label className="text-xs font-semibold block mb-1">
              Tags
            </label>
            <input
              type="text"
              placeholder="Travel, Friends, Adventure"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={`w-full py-1.5 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs outline-none
                ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
            />
          </div>

          {/* Clear, Solid, Accessible Action Buttons (No cut-off, fully legible) */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl border-2 border-[#1a2c35] text-xs font-bold transition-all cursor-pointer active:scale-95
                ${
                  isDark
                    ? 'bg-[#14373d] text-white hover:bg-[#1a454d]'
                    : 'bg-white text-[#1a2c35] hover:bg-neutral-100 shadow-xs'
                }
              `}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl border-2 border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35] hover:bg-[#ffc44d] active:scale-95 shadow-[0_2px_0_0_#a35d10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
