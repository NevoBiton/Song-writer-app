import { useState, useEffect } from 'react';
import { Song } from './types';
import { useSongLibrary } from './hooks/useSongLibrary';
import SongList from './components/SongList/SongList';
import SongEditor from './components/SongEditor/SongEditor';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function App() {
  // Single source of truth — never instantiate useSongLibrary elsewhere
  const { songs, createSong, deleteSong, duplicateSong, importChordPro, updateSong } = useSongLibrary();
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const isMobile = useIsMobile();

  function handleSelectSong(song: Song) {
    setActiveSong(song);
  }

  function handleSaveSong(song: Song) {
    updateSong(song);
    setActiveSong(song);
  }

  function handleBack() {
    setActiveSong(null);
  }

  if (activeSong) {
    return (
      <SongEditor
        song={activeSong}
        onSave={handleSaveSong}
        onBack={handleBack}
        isMobile={isMobile}
      />
    );
  }

  return (
    <SongList
      songs={songs}
      onSelectSong={handleSelectSong}
      onCreateSong={createSong}
      onDeleteSong={deleteSong}
      onDuplicateSong={duplicateSong}
      onImportChordPro={importChordPro}
      isMobile={isMobile}
    />
  );
}
