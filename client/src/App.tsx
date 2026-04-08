import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useNavigationType, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient } from './lib/queryClient';
import { Song } from './types';
import { useSongLibrary } from './hooks/useSongLibrary';
import SongList from './components/SongList/SongList';
import SongEditor from './components/SongEditor/SongEditor';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import HomePage from './components/Home/HomePage';
import { AppLayout } from './components/Layout/AppLayout';
import { ThemeProvider } from './context/ThemeContext';
import { UILanguageProvider } from './context/UILanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function AuthenticatedApp() {
  const { songs, loading, createSong, deleteSong, duplicateSong, updateSong, deletedSongs, restoreSong, permanentDeleteSong } =
    useSongLibrary();
  const { user } = useAuth();
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const location = useLocation();

  const displayName = user?.username || user?.email?.split('@')[0] || '';

  // Clear active song when user navigates with browser back/forward
  useEffect(() => {
    if (navigationType === 'POP') {
      setActiveSong(null);
    }
  }, [location, navigationType]);

  function handleSelectSong(song: Song) {
    setActiveSong(song);
    navigate('/library');
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
      toast.success(`"${song.title}" created`);
      setShowCreateDialog(false);
      setActiveSong(song);
      navigate('/library');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSong(id: string) {
    const song = songs.find(s => s.id === id);
    await deleteSong(id);
    toast.success(`"${song?.title ?? 'Song'}" moved to Recently Deleted`);
  }

  async function handleRestoreSong(id: string) {
    const song = deletedSongs.find(s => s.id === id);
    await restoreSong(id);
    toast.success(`"${song?.title ?? 'Song'}" restored`);
  }

  async function handlePermanentDeleteSong(id: string) {
    await permanentDeleteSong(id);
    toast.success('Song permanently deleted');
  }

  async function handleDuplicateSong(id: string) {
    const song = await duplicateSong(id);
    toast.success(`Duplicated "${song?.title}"`);
    return song;
  }

  function handleSaveSong(song: Song) {
    updateSong(song);
    setActiveSong(song);
  }

  function handleBack() {
    setActiveSong(null);
    navigate('/library');
  }

  const layout = (child: React.ReactNode) => (
    <AppLayout activeSong={activeSong} onBackToLibrary={() => setActiveSong(null)}>
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
          element={
            activeSong ? (
              // SongEditor is full-viewport — rendered outside the AppLayout padded container
              <SongEditor
                song={activeSong}
                onSave={handleSaveSong}
                onBack={handleBack}
                isMobile={isMobile}
              />
            ) : (
              layout(
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
              )
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Song</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="space-y-1.5">
              <Label htmlFor="song-title">Song title</Label>
              <Input
                id="song-title"
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSong()}
                placeholder="Song title"
                className="focus-visible:ring-amber-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateSong}
              disabled={!newTitle.trim() || creating}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold border-0"
            >
              {creating ? 'Creating...' : 'Create'}
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
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
              <Toaster />
            </AuthProvider>
          </BrowserRouter>
        </UILanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
