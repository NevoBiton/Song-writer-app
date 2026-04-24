import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from 'sonner';
import { queryClient } from './lib/queryClient';
import { Song } from './types';
import { useSongLibrary } from './hooks/useSongLibrary';
import SongList from './components/SongList/SongList';
import SongEditor from './components/SongEditor/SongEditor';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
import HomePage from './components/Home/HomePage';
import { AppLayout } from './components/Layout/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { UILanguageProvider, useUILanguage } from './context/UILanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

function GoogleOAuthWrapper({ children }: { children: ReactNode }) {
  const { uiLang } = useUILanguage();
  const locale = uiLang === 'he' ? 'iw' : 'en';
  return (
    <GoogleOAuthProvider
      key={locale}
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}
      locale={locale}
    >
      {children}
    </GoogleOAuthProvider>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function SongEditorRoute({ songs, loading, isMobile, updateSong }: {
  songs: Song[];
  loading: boolean;
  isMobile: boolean;
  updateSong: (song: Song) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const song = songs.find(s => s.id === id) ?? null;

  if (loading && !song) {
    return (
      <AppLayout raw>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Loading...
        </div>
      </AppLayout>
    );
  }

  if (!song) return <Navigate to="/library" replace />;

  return (
    <AppLayout activeSong={song} onBackToLibrary={() => navigate('/library')} raw>
      <SongEditor
        key={song.id}
        song={song}
        onSave={updateSong}
        onBack={() => navigate('/library')}
        isMobile={isMobile}
      />
    </AppLayout>
  );
}

function AuthenticatedApp() {
  const { songs, loading, createSong, deleteSong, duplicateSong, updateSong, deletedSongs, restoreSong, permanentDeleteSong } =
    useSongLibrary();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const { t, uiLang } = useUILanguage();
  const isRtl = uiLang === 'he';
  const displayName = user?.username || user?.email?.split('@')[0] || '';

  function handleSelectSong(song: Song) {
    navigate(`/library/${song.id}`);
  }

  function openCreateDialog() {
    setNewTitle('');
    setShowCreateDialog(true);
  }

  async function handleCreateSong() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const song = await createSong(newTitle.trim(), 'en');
      toast.success(t.toastSongCreated.replace('{title}', song.title));
      setShowCreateDialog(false);
      navigate(`/library/${song.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSong(id: string) {
    const song = songs.find(s => s.id === id);
    await deleteSong(id);
    toast.success(t.toastSongMovedToDeleted.replace('{title}', song?.title ?? 'Song'));
  }

  async function handleRestoreSong(id: string) {
    const song = deletedSongs.find(s => s.id === id);
    await restoreSong(id);
    toast.success(t.toastSongRestored.replace('{title}', song?.title ?? 'Song'));
  }

  async function handlePermanentDeleteSong(id: string) {
    await permanentDeleteSong(id);
    toast.success(t.toastSongPermanentlyDeleted);
  }

  async function handleDuplicateSong(id: string) {
    const song = await duplicateSong(id);
    toast.success(t.toastSongDuplicated.replace('{title}', song?.title ?? ''));
    return song;
  }

  const layout = (child: React.ReactNode) => (
    <AppLayout>
      {child}
    </AppLayout>
  );

  return (
    <>
      <Routes>
        <Route path="/sign-in" element={<Navigate to="/" replace />} />
        <Route path="/sign-up" element={<Navigate to="/" replace />} />
        <Route
          path="/"
          element={layout(
            <HomePage
              songs={songs}
              loading={loading}
              displayName={displayName}
              onSelectSong={handleSelectSong}
              onNewSong={openCreateDialog}
            />
          )}
        />
        <Route
          path="/library"
          element={layout(
            <SongList
              songs={songs}
              loading={loading}
              onSelectSong={handleSelectSong}
              onNewSong={openCreateDialog}
              onDeleteSong={handleDeleteSong}
              onDuplicateSong={handleDuplicateSong}
              deletedSongs={deletedSongs}
              onRestoreSong={handleRestoreSong}
              onPermanentDeleteSong={handlePermanentDeleteSong}
              isMobile={isMobile}
            />
          )}
        />
        <Route
          path="/library/:id"
          element={<SongEditorRoute songs={songs} loading={loading} isMobile={isMobile} updateSong={updateSong} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader className={isRtl ? 'text-right' : ''}>
            <DialogTitle>{t.newSong}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="space-y-1.5">
              <Label htmlFor="song-title">{t.songTitle}</Label>
              <Input
                id="song-title"
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSong()}
                placeholder={t.songTitle}
                className="focus-visible:ring-amber-400"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t.cancel}</Button>
            <Button
              onClick={handleCreateSong}
              disabled={!newTitle.trim() || creating}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {creating ? t.creating : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/sign-in" element={<LoginPage />} />
        <Route path="/sign-up" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UILanguageProvider>
          <GoogleOAuthWrapper>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
                <Toaster />
              </AuthProvider>
            </BrowserRouter>
          </GoogleOAuthWrapper>
        </UILanguageProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
