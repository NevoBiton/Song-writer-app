import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Music2, LogOut, Globe, Sun, Moon, HelpCircle,
  BookOpen, UserCog, Users, Bell,
} from 'lucide-react';
import { Song } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useUILanguage } from '@/context/UILanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useFriends } from '@/context/FriendsContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import ProfileModal, { getAvatarUrl } from '@/components/profile/ProfileModal';
import { FriendsModal } from '@/components/Friends/FriendsModal';
import { NotificationsPanel } from '@/components/Notifications/NotificationsPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
  activeSong?: Song | null;
  onBackToLibrary?: () => void;
  raw?: boolean;
}

export function AppLayout({ children, activeSong, onBackToLibrary, raw }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { uiLang, setUiLang, t } = useUILanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { pendingCount } = useFriends();
  const { data: notificationsList = [] } = useNotifications();
  const unreadNotifCount = notificationsList.filter(n => !n.isRead).length;
  const displayName = user?.username || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const avatarUrl = getAvatarUrl(user?.avatar, displayName);

  const isLibrary = location.pathname === '/library';

  function handleSignOut() {
    logout();
    navigate('/sign-in');
  }

  return (
    <div className={`bg-background flex flex-col ${raw ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* Navbar */}
      <header className="no-print bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => { onBackToLibrary?.(); navigate('/'); }}
            >
              <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center shadow-sm">
                <Music2 className="w-5 h-5 text-gray-900" />
              </div>
              <span className="font-bold text-foreground text-lg tracking-tight">
                {t.appName}
              </span>
            </div>

            {/* Center: nav tabs + optional breadcrumb */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => { onBackToLibrary?.(); navigate('/library'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isLibrary && !activeSong
                    ? 'bg-amber-400/15 text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.myLibrary}</span>
              </button>

            </nav>

            {/* Right side controls */}
            <div className="flex items-center gap-1.5">
              {/* Dark mode toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                title={isDark ? t.lightMode : t.darkMode}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Help */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>

              {/* Notifications bell */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="w-8 h-8 p-0 relative text-muted-foreground hover:text-foreground"
                title={t.notificationsTitle}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </Button>

              {/* Language toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground px-2 h-8">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs font-medium">
                      {uiLang === 'en' ? 'EN' : 'עב'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{t.language}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setUiLang('en')} className={uiLang === 'en' ? 'font-semibold' : ''}>
                    🇺🇸 English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setUiLang('he')} className={uiLang === 'he' ? 'font-semibold' : ''}>
                    🇮🇱 עברית
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative gap-1.5 text-foreground hover:bg-accent px-2 h-8">
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-6 h-6 rounded-full border border-amber-400 object-cover bg-amber-50"
                    />
                    <span className="hidden sm:inline text-xs font-medium max-w-20 truncate">
                      {displayName}
                    </span>
                    {pendingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-400 text-gray-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={avatarUrl}
                        alt="avatar"
                        className="w-9 h-9 rounded-full border border-amber-400 object-cover bg-amber-50 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfile(true)}>
                    <UserCog className="w-4 h-4 mr-2" />
                    {t.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFriends(true)} className="relative">
                    <Users className="w-4 h-4 mr-2" />
                    {t.friendsTitle}
                    {pendingCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-amber-400 text-gray-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Yellow accent bar */}
      <div className="no-print h-0.5 bg-amber-400 w-full" />

      {/* Main content */}
      {raw ? (
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      )}

      {/* Profile modal */}
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />

      {/* Friends modal */}
      <FriendsModal open={showFriends} onClose={() => setShowFriends(false)} />

      {/* Notifications panel */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t.notificationsTitle}</DialogTitle>
          </DialogHeader>
          <NotificationsPanel onClose={() => setShowNotifications(false)} />
        </DialogContent>
      </Dialog>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.helpTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {[
              { title: t.helpStep1Title, desc: t.helpStep1 },
              { title: t.helpStep2Title, desc: t.helpStep2 },
              { title: t.helpStep3Title, desc: t.helpStep3 },
              { title: t.helpStep4Title, desc: t.helpStep4 },
              { title: t.helpStep5Title, desc: t.helpStep5 },
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-gray-900 flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
