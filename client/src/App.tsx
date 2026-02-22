import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UILanguageProvider } from './context/UILanguageContext';
import { Toaster } from './components/ui/sonner';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function AuthenticatedApp() {
  const { songs, loading, createSong, deleteSong, duplicateSong, updateSong } =
    useSongLibrary();
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  function handleSelectSong(song: Song) {
    setActiveSong(song);
    navigate('/library');
  }

  async function handleCreateSong(title: string, language: Song['language']): Promise<Song> {
    const song = await createSong(title, language);
    toast.success(`"${song.title}" created`);
    return song;
  }

  async function handleDeleteSong(id: string) {
    const song = songs.find(s => s.id === id);
    await deleteSong(id);
    toast.success(`"${song?.title ?? 'Song'}" deleted`);
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
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route
        path="/"
        element={layout(
          <HomePage
            songs={songs}
            onSelectSong={handleSelectSong}
            onCreateSong={handleCreateSong}
          />
        )}
      />
      <Route
        path="/library"
        element={layout(
          activeSong ? (
            <SongEditor
              song={activeSong}
              onSave={handleSaveSong}
              onBack={handleBack}
              isMobile={isMobile}
            />
          ) : (
            <SongList
              songs={songs}
              loading={loading}
              onSelectSong={handleSelectSong}
              onCreateSong={handleCreateSong}
              onDeleteSong={handleDeleteSong}
              onDuplicateSong={handleDuplicateSong}
              isMobile={isMobile}
            />
          )
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster />
            </BrowserRouter>
          </AuthProvider>
        </UILanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
