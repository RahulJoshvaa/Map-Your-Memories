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
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { lookupUserByEmail } from '../../services/notificationsService';

// Permission levels for collaborators
const PERMISSION_LEVELS = [
  {
    value: 'Viewer',
    label: 'Viewer',
    icon: Eye,
    desc: 'Can view memory, media, and location only',
    color: 'text-sky-500',
  },
  {
    value: 'Editor',
    label: 'Editor',
    icon: Edit3,
    desc: 'Can upload media and comment on memories',
    color: 'text-[#02a896]',
  },
  {
    value: 'Admin',
    label: 'Admin',
    icon: Shield,
    desc: 'Can edit details and manage collaborators',
    color: 'text-[#ffb72b]',
  },
];

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
  
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  
  // Real Uploaded File Objects state
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Collaborators state — each item: { email, name, role, validated: true }
  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState('Editor');
  const [collaboratorValidating, setCollaboratorValidating] = useState(false);
  const [collaboratorValidationMsg, setCollaboratorValidationMsg] = useState('');
  const [collaboratorValidationStatus, setCollaboratorValidationStatus] = useState(''); // 'ok' | 'error' | ''

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Synchronize when coordinates are picked from the map
  React.useEffect(() => {
    if (selectedMapCoords) {
      setLatitude(selectedMapCoords.lat.toString());
      setLongitude(selectedMapCoords.lng.toString());
      if (selectedMapCoords.name) {
        setLocationName(selectedMapCoords.name);
      } else if (!locationName || locationName.startsWith('Location (')) {
        setLocationName(`Location (${selectedMapCoords.lat}, ${selectedMapCoords.lng})`);
      }
    }
  }, [selectedMapCoords]);

  if (!isOpen) return null;

  // Handle native file upload
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
        file,
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

  // Clear validation state when input changes
  const handleCollaboratorInputChange = (e) => {
    setCollaboratorInput(e.target.value);
    setCollaboratorValidationMsg('');
    setCollaboratorValidationStatus('');
  };

  // Validate + add collaborator
  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    const email = collaboratorInput.trim();
    if (!email) return;

    // Duplicate check locally first
    if (collaborators.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
      setCollaboratorValidationMsg('This person is already added.');
      setCollaboratorValidationStatus('error');
      return;
    }

    setCollaboratorValidating(true);
    setCollaboratorValidationMsg('Checking...');
    setCollaboratorValidationStatus('');

    try {
      // Hit /api/auth/lookup-user to verify the email exists
      const foundUser = await lookupUserByEmail(email);
      // Success: add to collaborators list
      setCollaborators((prev) => [
        ...prev,
        { email: foundUser.email, name: foundUser.name, role: collaboratorRole, validated: true },
      ]);
      setCollaboratorInput('');
      setCollaboratorValidationMsg(`✓ ${foundUser.name} added as ${collaboratorRole}`);
      setCollaboratorValidationStatus('ok');
      setTimeout(() => {
        setCollaboratorValidationMsg('');
        setCollaboratorValidationStatus('');
      }, 3000);
    } catch (err) {
      setCollaboratorValidationMsg(err?.message || 'User not found. They must register first.');
      setCollaboratorValidationStatus('error');
    } finally {
      setCollaboratorValidating(false);
    }
  };

  const handleRemoveCollaborator = (email) => {
    setCollaborators((prev) => prev.filter((c) => c.email !== email));
  };

  const handleChangeCollaboratorRole = (email, newRole) => {
    setCollaborators((prev) =>
      prev.map((c) => (c.email === email ? { ...c, role: newRole } : c))
    );
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
      const rawFiles = uploadedFiles.map((f) => f.file).filter(Boolean);
      const displayDate = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

      await onCreate({
        title: title.trim(),
        description: description.trim(),
        locationName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        date: startDate,
        dateRange: displayDate,
        tags,
        files: rawFiles,
        collaborators: collaborators.map((c) => ({ name: c.name, email: c.email, role: c.role })),
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create pin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const permInfo = PERMISSION_LEVELS.find((p) => p.value === collaboratorRole);

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

          {/* Location Name & Geographic Coordinates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold">
                Location Name & Coordinates
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

            <div>
              <span className="text-[11px] opacity-70 block mb-1">
                Name of Place / Landmark
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Fort Kochi Beach, Ooty Tea Garden"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className={`flex-1 py-2 px-3 rounded-xl border-2 border-[#1a2c35] font-medium text-xs sm:text-sm outline-none transition-all
                    ${
                      isDark
                        ? 'bg-[#0a2327] text-white focus:border-[#ffb72b]'
                        : 'bg-[#faf8f5] text-[#1a2c35] focus:border-[#02a896]'
                    }
                  `}
                />
                <button
                  type="button"
                  onClick={onStartMapPick}
                  className="px-3 py-2 rounded-xl btn-3d-yellow text-xs font-semibold cursor-pointer shrink-0"
                >
                  Pick on Map
                </button>
              </div>
            </div>

            <div className={`p-2 px-3 rounded-xl border border-[#1a2c35]/30 flex items-center justify-between text-[11px]
              ${isDark ? 'bg-[#0a2327]/60 text-neutral-300' : 'bg-[#faf8f5] text-[#1a2c35]/80'}
            `}>
              <span className="font-medium">Selected Coordinates:</span>
              <span className="font-mono text-[10px] font-bold">
                {latitude}, {longitude}
              </span>
            </div>
          </div>

          {/* DATE RANGE */}
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

          {/* UPLOAD MEDIA */}
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

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleNativeFileUpload}
              className="hidden"
            />

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

          {/* ADD COLLABORATORS — with validation + role picker */}
          <div className="space-y-2.5 pt-1 border-t border-[#1a2c35]/15 dark:border-[#1a2c35]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#ffb72b]" />
                <span>Add Collaborators</span>
              </label>
              <span className="text-[10px] opacity-60 font-medium">
                {collaborators.length} invited
              </span>
            </div>

            {/* Role picker */}
            <div className="grid grid-cols-3 gap-1.5">
              {PERMISSION_LEVELS.map((perm) => {
                const Icon = perm.icon;
                const isActive = collaboratorRole === perm.value;
                return (
                  <button
                    key={perm.value}
                    type="button"
                    onClick={() => setCollaboratorRole(perm.value)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-center transition-all cursor-pointer
                      ${
                        isActive
                          ? isDark
                            ? 'border-[#ffb72b] bg-[#ffb72b]/10'
                            : 'border-[#1a2c35] bg-[#fffae8]'
                          : isDark
                          ? 'border-[#1a2c35]/40 hover:border-[#1a2c35] bg-[#0a2327]/50'
                          : 'border-[#1a2c35]/20 hover:border-[#1a2c35]/60 bg-[#faf8f5]'
                      }
                    `}
                  >
                    <Icon className={`w-3.5 h-3.5 ${perm.color}`} />
                    <span className={`text-[10px] font-bold ${isActive ? '' : 'opacity-70'}`}>
                      {perm.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Permission description */}
            {permInfo && (
              <p className="text-[10px] opacity-60 font-medium px-1">
                {permInfo.desc}
              </p>
            )}

            {/* Email input + invite button */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="friend@email.com"
                value={collaboratorInput}
                onChange={handleCollaboratorInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCollaborator(e)}
                disabled={collaboratorValidating}
                className={`flex-1 py-1.5 px-3 rounded-xl border-2 border-[#1a2c35] text-xs font-normal outline-none transition-all
                  ${
                    collaboratorValidationStatus === 'error'
                      ? 'border-rose-500'
                      : collaboratorValidationStatus === 'ok'
                      ? 'border-[#02a896]'
                      : ''
                  }
                  ${isDark ? 'bg-[#0a2327] text-white' : 'bg-[#faf8f5] text-[#1a2c35]'}`}
              />
              <button
                type="button"
                onClick={handleAddCollaborator}
                disabled={collaboratorValidating || !collaboratorInput.trim()}
                className="px-3 py-1.5 rounded-xl border-2 border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35] hover:bg-[#ffc44d] text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {collaboratorValidating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Invite
              </button>
            </div>

            {/* Validation feedback */}
            {collaboratorValidationMsg && (
              <div className={`flex items-center gap-1.5 text-[11px] font-medium px-1
                ${collaboratorValidationStatus === 'ok' ? 'text-[#02a896]' : 'text-rose-500'}
              `}>
                {collaboratorValidationStatus === 'ok'
                  ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                }
                {collaboratorValidationMsg}
              </div>
            )}

            {/* Collaborator Pills with inline role changer */}
            {collaborators.length > 0 && (
              <div className="space-y-1.5 pt-0.5">
                {collaborators.map((collab) => {
                  const RoleIcon = PERMISSION_LEVELS.find((p) => p.value === collab.role)?.icon || Eye;
                  return (
                    <div
                      key={collab.email}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#1a2c35] 
                        ${isDark ? 'bg-[#0a2327]' : 'bg-white'}`}
                    >
                      {/* Avatar initial */}
                      <div className="w-6 h-6 rounded-lg bg-[#02a896] border border-[#1a2c35] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {collab.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{collab.name}</div>
                        <div className="text-[10px] opacity-60 truncate">{collab.email}</div>
                      </div>

                      {/* Inline role selector */}
                      <select
                        value={collab.role}
                        onChange={(e) => handleChangeCollaboratorRole(collab.email, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border border-[#1a2c35] outline-none cursor-pointer
                          ${isDark ? 'bg-[#0f4347] text-white' : 'bg-[#fffae8] text-[#1a2c35]'}`}
                      >
                        {PERMISSION_LEVELS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(collab.email)}
                        className="p-1 rounded-lg hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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

          {/* Action Buttons */}
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
              className="px-6 py-2.5 rounded-xl border-2 border-[#1a2c35] bg-[#ffb72b] text-[#1a2c35] hover:bg-[#ffc44d] active:scale-95 shadow-[0_2px_0_0_#a35d10] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? 'Creating...' : 'Create Pin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
