import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToastContext } from '../../contexts/ToastContext';
import { Logo } from './Logo';
import { ARIA_LABELS, KEYBOARD_KEYS, focusManagement, screenReader } from '../../utils/accessibility';

interface AppHeaderProps {
  className?: string;
  // Editor-specific props for enhanced breadcrumbs
  editorContext?: {
    isNewPost: boolean;
    postTitle?: string;
    isDirty?: boolean;
    onNavigateBack?: () => void;
  };
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  ariaLabel?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ className = '', editorContext }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Navigation items
  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      ariaLabel: ARIA_LABELS.GO_TO_DASHBOARD,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      label: 'Profile',
      path: '/profile',
      ariaLabel: ARIA_LABELS.GO_TO_PROFILE,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  // Get current page info for breadcrumbs
  const getCurrentPageInfo = () => {
    const path = location.pathname;

    if (path === '/dashboard') {
      // No breadcrumbs on dashboard - it's the root
      return { title: 'Dashboard', breadcrumbs: [] };
    }

    if (path === '/profile') {
      return { title: 'Profile', breadcrumbs: ['Profile'] };
    }

    if (path.startsWith('/editor/')) {
      // Use editor context for enhanced breadcrumbs if available
      if (editorContext) {
        const { isNewPost, postTitle } = editorContext;
        const editorTitle = isNewPost
          ? 'New Post'
          : (postTitle?.trim() || 'Edit Post');
        return {
          title: editorTitle,
          breadcrumbs: [editorTitle]
        };
      }

      // Fallback to basic detection
      const isNewPost = path === '/editor/new';
      const editorTitle = isNewPost ? 'New Post' : 'Edit Post';
      return {
        title: editorTitle,
        breadcrumbs: [editorTitle]
      };
    }

    return { title: 'Dashboard', breadcrumbs: [] };
  };

  const { title: currentPageTitle, breadcrumbs } = getCurrentPageInfo();

  // Close user menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.ESCAPE && isUserMenuOpen) {
        setIsUserMenuOpen(false);
        // Return focus to the user menu button
        const userMenuButton = userMenuRef.current?.querySelector('button');
        userMenuButton?.focus();
        // Announce to screen readers
        screenReader.announce('User menu closed');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsUserMenuOpen(false);
      showSuccess('Signing out...');
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      showError('Failed to sign out. Please try again.');
    }
  };

  // Focus first menu item when user menu opens
  useEffect(() => {
    if (isUserMenuOpen) {
      // Use setTimeout to ensure the menu is rendered before focusing
      setTimeout(() => {
        const firstMenuItem = userMenuRef.current?.querySelector('[role="menuitem"]') as HTMLElement;
        if (firstMenuItem) {
          firstMenuItem.focus();
          // Announce to screen readers
          screenReader.announce('User menu opened. Use arrow keys to navigate.');
        }
      }, 0);
    }
  }, [isUserMenuOpen]);



  const handleNavigateToDashboard = () => {
    // If we're in the editor with unsaved changes, use the custom handler
    if (editorContext?.isDirty && editorContext?.onNavigateBack) {
      editorContext.onNavigateBack();
    } else {
      navigate('/dashboard');
    }
  };

  // Handle keyboard navigation in user menu
  const handleUserMenuKeyDown = (event: React.KeyboardEvent) => {
    if (!isUserMenuOpen) return;

    const menuItems = userMenuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuItems) return;

    const currentIndex = Array.from(menuItems).findIndex(item => item === document.activeElement);

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault();
        const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        (menuItems[nextIndex] as HTMLElement).focus();
        break;
      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        (menuItems[prevIndex] as HTMLElement).focus();
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        (menuItems[0] as HTMLElement).focus();
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        (menuItems[menuItems.length - 1] as HTMLElement).focus();
        break;
      case KEYBOARD_KEYS.TAB:
        // Handle focus trapping
        focusManagement.trapFocus(userMenuRef.current!, event.nativeEvent);
        break;
    }
  };

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8" id="main-navigation">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-8 min-w-0">
            {/* Logo */}
            <button
              onClick={handleNavigateToDashboard}
              aria-label="Go to Dashboard - Betterer home"
              className="flex items-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md flex-shrink-0 min-h-touch min-w-touch"
            >
              <Logo size="md" showText={true} />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4 lg:space-x-6" role="navigation" aria-label={ARIA_LABELS.MAIN_NAVIGATION}>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    aria-label={item.ariaLabel}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center space-x-2 px-2 lg:px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-touch min-w-touch ${
                      isActive
                        ? 'text-primary bg-blue-50 border-b-2 border-primary'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Center - Breadcrumbs (Large screens only) */}
          {breadcrumbs.length > 0 && (
            <nav className="hidden xl:flex items-center space-x-2 text-sm text-gray-600 flex-1 justify-center" aria-label={ARIA_LABELS.BREADCRUMB_NAVIGATION}>
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb} className="flex items-center">
                    {index > 0 && (
                      <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <span
                      className="text-gray-900 font-medium truncate max-w-32"
                      aria-current="page"
                    >
                      {crumb}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Current page title (Mobile and tablet only) */}
            <div className="xl:hidden">
              <h1 className="text-sm sm:text-lg font-semibold text-gray-900 truncate max-w-20 sm:max-w-32">
                {currentPageTitle}
              </h1>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label={`${ARIA_LABELS.USER_MENU} for ${user?.attributes.name || user?.username}`}
                className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors min-h-touch min-w-touch"
              >
                {/* User Avatar */}
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-primary text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium" aria-hidden="true">
                  {user?.attributes.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>

                {/* User name (Desktop only) */}
                <span className="hidden lg:block text-sm font-medium truncate max-w-24 xl:max-w-32">
                  {user?.attributes.name || user?.username}
                </span>

                {/* Dropdown arrow */}
                <svg
                  className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Menu Dropdown */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  onKeyDown={handleUserMenuKeyDown}
                >
                  <div className="py-1">
                    {/* User info */}
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100" role="none">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.attributes.name || user?.username}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {user?.attributes.email}
                      </p>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          navigate('/about-my-writing');
                        }}
                        role="menuitem"
                        aria-label="View writing statistics and insights"
                        className="w-full text-left px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-2 transition-colors focus:outline-none focus:bg-gray-50 min-h-touch"
                      >
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>About My Writing</span>
                      </button>
                    </div>

                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        aria-label={ARIA_LABELS.SIGN_OUT}
                        className="w-full text-left px-3 sm:px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-2 transition-colors focus:outline-none focus:bg-gray-50 min-h-touch"
                      >
                        <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <nav className="flex space-x-2 overflow-x-auto" role="navigation" aria-label={ARIA_LABELS.MOBILE_NAVIGATION}>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  aria-label={item.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap min-h-touch ${
                    isActive
                      ? 'text-primary bg-blue-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
