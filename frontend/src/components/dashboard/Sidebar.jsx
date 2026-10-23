import React, { useState } from 'react';
import { 
  Home, 
  MapPin, 
  Users, 
  Star, 
  Clock, 
  History,
  Plus, 
  Settings, 
  X,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Logo } from '../Logo';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/auth/authService';

export const Sidebar = ({
  activeTab = 'home',
  onSelectTab,
  onCreateClick,
  onSettingsClick,
  onSignOut,
  isOpen = false,
  onClose,
  counts = {},
  user = null,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const activeUser = user || authService.getCachedUser() || { name: 'Explorer', email: '' };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      badge: null,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: History,
      badge: null,
    },
    {
      id: 'mypins',
      label: 'My Pins',
      icon: MapPin,
      badge: counts.myPins ?? 0,
    },
    {
      id: 'shared',
      label: 'Shared With Me',
      icon: Users,
      badge: counts.shared ?? 0,
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: Star,
      badge: counts.favorites ?? 0,
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: Clock,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-[#062024]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between border-r-3 border-[#1a2c35] select-none transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'w-64 lg:w-60 xl:w-64'}
          ${
            isDark
              ? 'bg-[#0a2327] text-white shadow-[4px_0_0_0_#041a1d]'
              : 'bg-[#fffdf9] text-[#1a2c35] shadow-[4px_0_0_0_#f0e2cd]'
          }
        `}
      >
        {/* Top: Logo, collapse toggle, & Close button on mobile */}
        <div className={`p-4 border-b border-[#1a2c35]/15 dark:border-[#1a2c35] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <Logo size="sm" showSubtitle={false} />}
          {isCollapsed && (
            <div className="w-10 h-10 rounded-xl bg-[#ffb72b] border-2 border-[#1a2c35] flex items-center justify-center font-chunky font-bold text-sm text-[#1a2c35]">
              M
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg border-2 border-[#1a2c35] bg-white dark:bg-[#0d292e] hover:bg-[#ffeb85] dark:hover:bg-[#0f4347] transition-all duration-150 cursor-pointer text-[#1a2c35] dark:text-neutral-200 shadow-xs active:scale-90"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 stroke-2.5 text-[#1a2c35] dark:text-white" /> : <ChevronLeft className="w-4 h-4 stroke-2.5 text-[#1a2c35] dark:text-white" />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 rounded-xl border-2 border-[#1a2c35] lg:hidden hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4 text-[#1a2c35] dark:text-neutral-200" />
          </button>
        </div>

        {/* Middle Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* Main Navigation Items */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer group text-left border-2
                    ${
                      isActive
                        ? isDark
                          ? 'bg-[#0f4347] text-[#ffb72b] border-[#ffb72b] shadow-[0_2px_0_0_#a35d10]'
                          : 'bg-[#fffae8] text-[#875505] border-[#1a2c35] shadow-[0_2px_0_0_#1a2c35]'
                        : isDark
                        ? 'border-transparent text-neutral-300 hover:bg-[#0f343a] hover:text-white'
                        : 'border-transparent text-[#1a2c35]/75 hover:bg-[#faf6ee] hover:text-[#1a2c35]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'stroke-2.5' : 'stroke-2'}`} />
                    {!isCollapsed && (
                      <span className={`truncate font-medium text-xs sm:text-sm ${isActive ? 'font-semibold' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && item.badge !== null && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-semibold border
                      ${
                        isActive
                          ? 'border-[#1a2c35] bg-white text-[#1a2c35]'
                          : isDark
                          ? 'border-[#1a2c35]/50 bg-[#062024] text-neutral-300'
                          : 'border-[#1a2c35]/30 bg-neutral-100 text-[#1a2c35]'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Minimal Create Pin Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onCreateClick();
                if (onClose) onClose();
              }}
              title={isCollapsed ? 'Create Pin' : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 px-3 py-2.5'} rounded-xl btn-3d-yellow font-semibold text-xs tracking-wide uppercase cursor-pointer transition-all duration-150`}
            >
              <Plus className="w-4 h-4 stroke-2.5 text-[#1a2c35]" />
              {!isCollapsed && <span>Create Pin</span>}
            </button>
          </div>
        </div>

        {/* Bottom User Profile & Settings */}
        <div className={`p-3 border-t border-[#1a2c35]/15 dark:border-[#1a2c35] space-y-2`}>
          {/* Settings button */}
          <button
            type="button"
            onClick={() => {
              onSettingsClick();
              if (onClose) onClose();
            }}
            title={isCollapsed ? 'Settings' : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-2.5'} px-2.5 py-2 rounded-xl text-xs font-medium text-[#1a2c35]/80 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#0f343a] transition-colors cursor-pointer`}
          >
            <Settings className="w-4 h-4 stroke-2 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          {/* User Profile Info Card */}
          <div className={`p-2 rounded-xl border border-[#1a2c35]/25 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}
            ${isDark ? 'bg-[#0d292e]' : 'bg-[#faf6ee]'}
          `}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#02a896] border border-[#1a2c35] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {(activeUser.name || 'E').charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="font-semibold text-xs truncate leading-tight text-[#1a2c35] dark:text-white">
                    {activeUser.name}
                  </div>
                  <div className="text-[10px] opacity-60 truncate">
                    {activeUser.email}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={onSignOut}
                title="Sign out to Login Page"
                className="p-1 rounded-lg hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer text-[#1a2c35]/70 dark:text-neutral-400 shrink-0 ml-1"
              >
                <LogOut className="w-3.5 h-3.5 stroke-2" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
