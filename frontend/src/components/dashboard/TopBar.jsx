import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Bell, 
  Menu, 
  X, 
  MapPin, 
  Calendar,
  Share2,
  Star,
  CheckCircle2,
  SlidersHorizontal,
  UserMinus,
  AlertCircle,
  RefreshCw,
  UserPlus,
  Check,
  Sparkles,
  Loader2,
  FileText,
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/auth/authService';
import { notificationsService } from '../../services/notificationsService';
import { describeFilters } from '../../services/search/aiSearchService';

// Relative time formatter
function timeAgo(dateStr) {
  const now = Date.now();
  // Timestamps are UTC; if one arrives without an offset, don't let the browser treat it as local time
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const past = new Date(hasZone ? dateStr : `${dateStr}Z`).getTime();
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// Icon by notification type
function NotifIcon({ type }) {
  const base = 'w-3.5 h-3.5';
  if (type === 'share') return <Share2 className={`${base} text-[#02a896]`} />;
  if (type === 'collaboration_invite') return <UserPlus className={`${base} text-[#02a896]`} />;
  if (type === 'invite_accepted') return <CheckCircle2 className={`${base} text-[#02a896]`} />;
  if (type === 'invite_rejected') return <UserMinus className={`${base} text-rose-500`} />;
  if (type === 'collaborator_removed') return <UserMinus className={`${base} text-rose-500`} />;
  if (type === 'pin_updated') return <CheckCircle2 className={`${base} text-[#02a896]`} />;
  if (type === 'pin_deleted') return <AlertCircle className={`${base} text-rose-500`} />;
  return <Star className={`${base} text-[#ffb72b] fill-[#ffb72b]`} />;
}

export const TopBar = ({
  searchQuery = '',
  onSearchChange,
  onMenuToggle,
  onQuickResultSelect,
  searchResults = [],
  activeTab = 'home',
  user = null,
  onInviteResponded,
  onAiSearch,
  aiSearch = null,
  aiSearchLoading = false,
  aiSearchError = '',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const activeUser = user || authService.getCachedUser() || { name: 'Explorer' };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);

  // ─── Real notification state ──────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    setNotifError('');
    try {
      const res = await notificationsService.getNotifications();
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unread_count ?? 0);
    } catch (err) {
      setNotifError('Could not load notifications.');
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Load on mount + poll every 30s
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Load when dropdown opens
  const handleToggleNotifications = async () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      await loadNotifications();
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await notificationsService.markRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  // Accept / decline a collaboration invite
  const [respondingId, setRespondingId] = useState(null);
  const handleRespondToInvite = async (n, accept) => {
    setRespondingId(n.id);
    try {
      await notificationsService.respondToInvite(n.pin_id, accept);
      if (onInviteResponded) onInviteResponded(n.pin_id, accept);
    } catch (err) {
      setNotifError(err?.message || 'Could not respond to the invitation.');
    } finally {
      setRespondingId(null);
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  // Close popups on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className={`w-full h-16 px-4 sm:px-6 border-b-3 border-[#1a2c35] flex items-center justify-between gap-3 sm:gap-4 select-none relative z-30 transition-colors duration-200
        ${
          isDark
            ? 'bg-[#0a2327] text-white shadow-[0_3px_0_0_#041a1d]'
            : 'bg-[#fffdf9] text-[#1a2c35] shadow-[0_3px_0_0_#f0e2cd]'
        }
      `}
    >
      {/* Left: Mobile Menu Button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open sidebar"
          className="lg:hidden p-2 rounded-xl border-2 border-[#1a2c35] btn-3d-white flex items-center justify-center cursor-pointer transition-transform active:scale-95"
        >
          <Menu className="w-4 h-4 text-[#1a2c35] stroke-2" />
        </button>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-lg mx-2 relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 pointer-events-none flex items-center text-[#1a2c35]/50 dark:text-neutral-400">
            <Search className="w-4 h-4 stroke-2" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            id="global-memory-search"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onAiSearch && searchQuery.trim() && !aiSearchLoading) {
                e.preventDefault();
                setShowSearchDropdown(true);
                onAiSearch(searchQuery);
              } else if (e.key === 'Escape') {
                setShowSearchDropdown(false);
              }
            }}
            placeholder="Search your memories..."
            className={`w-full py-2 sm:py-2.5 pl-10 pr-9 rounded-xl font-medium text-xs sm:text-sm border-2.5 border-[#1a2c35] outline-none transition-all
              ${
                isDark
                  ? 'bg-[#0d292e] text-white placeholder:text-neutral-400 shadow-[0_2px_0_0_#041a1d] focus:border-[#ffb72b] focus:shadow-[0_2px_0_0_#ffb72b]'
                  : 'bg-[#faf8f5] text-[#1a2c35] placeholder:text-[#1a2c35]/45 shadow-[0_2px_0_0_#e2d7c5] focus:bg-white focus:border-[#02a896] focus:shadow-[0_2px_0_0_#02a896]'
              }
            `}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[#1a2c35]/60 dark:text-neutral-400 transition-colors"
            >
              <X className="w-3.5 h-3.5 stroke-2" />
            </button>
          )}
        </div>

        {/* Live Search Quick Results Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div 
            className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border-2.5 border-[#1a2c35] p-2 max-h-80 overflow-y-auto z-50 animate-fadeIn
              ${
                isDark
                  ? 'bg-[#0d292e] text-white shadow-[0_6px_0_0_#041a1d,0_6px_0_2.5px_#1a2c35]'
                  : 'bg-white text-[#1a2c35] shadow-[0_6px_0_0_#cbd5e1,0_6px_0_2.5px_#1a2c35]'
              }
            `}
          >
            <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider flex items-center justify-between gap-2">
              <span className="opacity-60 flex items-center gap-1">
                {aiSearch && <Sparkles className="w-3 h-3 text-[#02a896] dark:text-[#ffb72b]" />}
                {aiSearch ? 'AI Matches' : 'Matching Memories'} ({searchResults.length})
              </span>
              {onAiSearch && !aiSearch && !aiSearchLoading && (
                <span className="normal-case tracking-normal opacity-60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Press Enter for AI search
                </span>
              )}
              {aiSearchLoading && (
                <span className="normal-case tracking-normal opacity-70 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Searching with AI...
                </span>
              )}
            </div>

            {/* How the AI understood the query */}
            {aiSearch && (
              <div className="px-2.5 pb-1.5 flex flex-wrap gap-1">
                {describeFilters(aiSearch.filters).length === 0 ? (
                  <span className="text-[11px] opacity-60">No specific filters found — showing all your memories.</span>
                ) : (
                  describeFilters(aiSearch.filters).map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-lg border border-[#1a2c35] bg-[#fffae8] text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-200"
                    >
                      {chip}
                    </span>
                  ))
                )}
              </div>
            )}

            {aiSearchError && (
              <div className="mx-1 mb-1 p-2 rounded-xl border border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                {aiSearchError}
              </div>
            )}

            {searchResults.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs font-normal opacity-80">
                  No memories found for "{searchQuery}".
                </p>
                <p className="text-[11px] opacity-60 mt-1">
                  {aiSearch
                    ? 'Try a different date range, place, or keyword.'
                    : 'Search by title, description, location name, or tags — or press Enter to search with AI, e.g. "memories from 19 October to 20 October".'}
                </p>
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {searchResults.slice(0, 5).map((mem) => (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => {
                      onQuickResultSelect(mem);
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer border border-transparent
                      ${
                        isDark
                          ? 'hover:bg-[#0f4347] hover:border-[#1a2c35]'
                          : 'hover:bg-[#fffae8] hover:border-[#1a2c35]'
                      }
                    `}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#ffb72b] border-2 border-[#1a2c35] flex items-center justify-center text-xs shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-[#1a2c35]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-chunky font-bold text-xs sm:text-sm truncate">
                          {mem.title}
                        </div>
                        <div className="text-[11px] opacity-70 flex items-center gap-2">
                          <span className="flex items-center gap-0.5 font-normal">
                            <MapPin className="w-3 h-3 text-[#02a896]" />
                            {mem.locationName}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5 font-normal">
                            <Calendar className="w-3 h-3" />
                            {mem.date}
                          </span>
                        </div>
                        {aiSearch?.contentMatches?.[mem.id] && (
                          <div className="mt-0.5 text-[11px] opacity-80 flex items-start gap-1 font-normal">
                            <FileText className="w-3 h-3 mt-0.5 shrink-0 text-[#02a896] dark:text-[#ffb72b]" />
                            <span className="line-clamp-2">
                              <span className="font-semibold">{aiSearch.contentMatches[mem.id].fileName}:</span>{' '}
                              {aiSearch.contentMatches[mem.id].snippet}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg border border-[#1a2c35] bg-white text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-200 shrink-0">
                      View
                    </span>
                  </button>
                ))}
                {aiSearch && searchResults.length > 5 && (
                  <p className="px-2.5 pt-1 text-[11px] opacity-60">
                    +{searchResults.length - 5} more shown on the map
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Notifications, Theme Toggle, User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notification Bell with Badge */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={handleToggleNotifications}
            aria-label="View notifications"
            className="w-9 h-9 rounded-xl border-2 border-[#1a2c35] btn-3d-white flex items-center justify-center relative cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#1a2c35] stroke-2" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#ffb72b] border border-[#1a2c35] text-[8px] font-black text-[#1a2c35] items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div 
              className={`absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border-2.5 border-[#1a2c35] p-3 z-50 animate-fadeIn
                ${
                  isDark
                    ? 'bg-[#0d292e] text-white shadow-[0_6px_0_0_#041a1d,0_6px_0_2.5px_#1a2c35]'
                    : 'bg-white text-[#1a2c35] shadow-[0_6px_0_0_#cbd5e1,0_6px_0_2.5px_#1a2c35]'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1a2c35]/20 dark:border-[#1a2c35]">
                <h4 className="font-chunky font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#ffb72b] text-[#1a2c35] text-[9px] font-black leading-none">
                      {unreadCount}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadNotifications}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#0f4347] transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3 h-3 opacity-60 ${notifLoading ? 'animate-spin' : ''}`} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-medium text-[#02a896] dark:text-[#ffb72b] cursor-pointer hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              {notifLoading && notifications.length === 0 ? (
                <div className="py-6 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto opacity-40 mb-2" />
                  <p className="text-[11px] opacity-60">Loading...</p>
                </div>
              ) : notifError ? (
                <div className="py-4 text-center text-[11px] text-rose-500">
                  {notifError}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell className="w-6 h-6 mx-auto opacity-30 mb-2" />
                  <p className="text-[11px] opacity-60 font-medium">No notifications yet</p>
                  <p className="text-[10px] opacity-40 mt-0.5">
                    You'll see updates when memories are shared with you.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      onKeyDown={(e) => e.key === 'Enter' && !n.is_read && handleMarkRead(n.id)}
                      className={`w-full p-2.5 rounded-xl border transition-all flex items-start gap-2.5 text-left cursor-pointer
                        ${
                          !n.is_read
                            ? isDark
                              ? 'bg-[#0f4347] border-[#ffb72b] hover:bg-[#134044]'
                              : 'bg-[#fffae8] border-[#1a2c35] hover:bg-[#fff5d4]'
                            : isDark
                            ? 'bg-[#0a2327] border-[#1a2c35]/40 opacity-70'
                            : 'bg-[#faf8f5] border-[#1a2c35]/20 opacity-70'
                        }
                      `}
                    >
                      <div className="p-1.5 rounded-lg border border-[#1a2c35] bg-white dark:bg-[#0a2327] text-[#1a2c35] dark:text-white shrink-0">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-chunky font-bold text-xs truncate flex items-center gap-1.5">
                          {n.title}
                          {!n.is_read && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ffb72b] shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] font-normal opacity-75 leading-snug mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                        {n.type === 'collaboration_invite' && n.invite_status === 'pending' && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              type="button"
                              disabled={respondingId === n.id}
                              onClick={(e) => { e.stopPropagation(); handleRespondToInvite(n, true); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1a2c35] bg-[#02a896] text-white text-[10px] font-bold cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-wait"
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={respondingId === n.id}
                              onClick={(e) => { e.stopPropagation(); handleRespondToInvite(n, false); }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1a2c35] bg-white text-[#1a2c35] dark:bg-[#0a2327] dark:text-white text-[10px] font-bold cursor-pointer hover:border-rose-500 hover:text-rose-500 disabled:opacity-50 disabled:cursor-wait"
                            >
                              <X className="w-3 h-3" />
                              Decline
                            </button>
                          </div>
                        )}
                        {n.type === 'collaboration_invite' && n.invite_status && n.invite_status !== 'pending' && (
                          <div className={`text-[10px] font-semibold mt-1 ${n.invite_status === 'accepted' ? 'text-[#02a896]' : 'text-rose-500'}`}>
                            {{ accepted: 'You accepted this invite', rejected: 'You declined this invite', cancelled: 'Invite was cancelled' }[n.invite_status]}
                          </div>
                        )}
                        <div className="text-[9px] font-medium opacity-50 mt-1">
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="scale-85 origin-center">
          <ThemeToggle />
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-[#1a2c35]/20 dark:border-[#1a2c35]">
          <div className="w-8 h-8 rounded-xl bg-[#02a896] border-2 border-[#1a2c35] flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0">
            {(activeUser.name || 'E').charAt(0).toUpperCase()}
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="font-chunky font-bold text-xs text-[#1a2c35] dark:text-white leading-tight">
              {activeUser.name}
            </span>
            <span className="text-[10px] font-medium text-[#02a896] dark:text-[#ffb72b]">
              Explorer
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
