import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import {
  Music2, LogOut, Globe, Sun, Moon, HelpCircle,
  BookOpen, Home, ChevronRight,
} from 'lucide-react';
import { Song } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useUILanguage } from '@/context/UILanguageContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
}

export function AppLayout({ children, activeSong, onBackToLibrary }: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { isDark, toggleTheme } = useTheme();
  const { uiLang, setUiLang, t } = useUILanguage();
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setUserLoading(false);
    });
  }, []);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const email = user?.email || '';
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=fbbf24`;

  const isLibrary = location.pathname === '/library';
  const isHome = location.pathname === '/';

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/sign-in');
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir={uiLang === 'he' ? 'rtl' : 'ltr'}
    >
      {/* Navbar */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={() => { onBackToLibrary?.(); navigate('/'); }}
            >
              <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm">
                <Music2 className="w-3.5 h-3.5 text-gray-900" />
              </div>
              <span className="font-bold text-foreground text-base tracking-tight hidden sm:block">
                {t.appName}
              </span>
            </div>

            {/* Center: nav tabs + optional breadcrumb */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => { onBackToLibrary?.(); navigate('/'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isHome && !activeSong
                    ? 'bg-amber-400/15 text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Home</span>
              </button>

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

              {activeSong && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-400/15 max-w-[160px] truncate"
                    title={activeSong.title}
                  >
                    {activeSong.title || 'Untitled'}
                  </span>
                </>
              )}
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
              {userLoading ? (
                <div className="flex items-center gap-1.5 px-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="hidden sm:block h-3 w-16" />
                </div>
              ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-foreground hover:bg-accent px-2 h-8">
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="w-6 h-6 rounded-full border border-amber-400 object-cover bg-amber-50"
                    />
                    <span className="hidden sm:inline text-xs font-medium max-w-20 truncate">
                      {displayName}
                    </span>
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
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Yellow accent bar */}
      <div className="h-0.5 bg-amber-400 w-full" />

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

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
