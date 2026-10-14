import React, { useState, useRef, useEffect } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { CURRENT_USER } from '../../data/mockMemories';

export const TopBar = ({
  searchQuery = '',
  onSearchChange,
  onMenuToggle,
  onQuickResultSelect,
  searchResults = [],
  activeTab = 'home',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef(null);
  const notifRef = useRef(null);

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

  const mockNotifications = [
    {
      id: 'n1',
      title: 'Memory Shared With You',
      desc: 'Arjun shared "Goa Coastal Villa Escape" with Editor access.',
      time: '15m ago',
      unread: true,
      iconType: 'share',
    },
    {
      id: 'n2',
      title: 'Favorite Pinned',
      desc: 'You starred "Marina Beach Kite Festival".',
      time: '3h ago',
      unread: false,
      iconType: 'star',
    },
    {
      id: 'n3',
      title: 'Geographic Vault Synced',
      desc: '11 memory markers verified across South India.',
      time: '1d ago',
      unread: false,
      iconType: 'check',
    },
  ];

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
            <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider opacity-60 flex items-center justify-between">
              <span>Matching Memories ({searchResults.length})</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs font-normal opacity-80">
                  No memories found for "{searchQuery}".
                </p>
                <p className="text-[11px] opacity-60 mt-1">
                  Search by title, description, location name, or tags.
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
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg border border-[#1a2c35] bg-white text-[#1a2c35] dark:bg-[#062024] dark:text-neutral-200 shrink-0">
                      View
                    </span>
                  </button>
                ))}
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
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            className="w-9 h-9 rounded-xl border-2 border-[#1a2c35] btn-3d-white flex items-center justify-center relative cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#1a2c35] stroke-2" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#ffb72b] border border-[#1a2c35] text-[8px] font-black text-[#1a2c35] items-center justify-center">
                1
              </span>
            </span>
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
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1a2c35]/20 dark:border-[#1a2c35]">
                <h4 className="font-chunky font-bold text-xs uppercase tracking-wider">Notifications</h4>
                <span className="text-[10px] font-medium text-[#02a896] dark:text-[#ffb72b] cursor-pointer">
                  Mark all as read
                </span>
              </div>

              <div className="space-y-2">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5
                      ${
                        n.unread
                          ? isDark
                            ? 'bg-[#0f4347] border-[#ffb72b]'
                            : 'bg-[#fffae8] border-[#1a2c35]'
                          : isDark
                          ? 'bg-[#0a2327] border-[#1a2c35]/40 opacity-80'
                          : 'bg-[#faf8f5] border-[#1a2c35]/20 opacity-80'
                      }
                    `}
                  >
                    <div className="p-1.5 rounded-lg border border-[#1a2c35] bg-white dark:bg-[#0a2327] text-[#1a2c35] dark:text-white shrink-0">
                      {n.iconType === 'share' && <Share2 className="w-3.5 h-3.5 text-[#02a896]" />}
                      {n.iconType === 'star' && <Star className="w-3.5 h-3.5 text-[#ffb72b] fill-[#ffb72b]" />}
                      {n.iconType === 'check' && <CheckCircle2 className="w-3.5 h-3.5 text-[#02a896]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-chunky font-bold text-xs truncate">
                        {n.title}
                      </div>
                      <div className="text-[11px] font-normal opacity-75 leading-snug mt-0.5">
                        {n.desc}
                      </div>
                      <div className="text-[9px] font-medium opacity-50 mt-1">
                        {n.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            {CURRENT_USER.name.charAt(0)}
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="font-chunky font-bold text-xs text-[#1a2c35] dark:text-white leading-tight">
              {CURRENT_USER.name}
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
