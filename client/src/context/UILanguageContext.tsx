import React, { createContext, useContext, useState } from 'react';

export type UILang = 'en' | 'he';

export const translations = {
  en: {
    appName: 'SongWriter Pro',
    myLibrary: 'My Library',
    help: 'Help',
    signOut: 'Sign Out',
    profile: 'My Profile',
    language: 'Language',
    newSong: 'New Song',
    import: 'Import',
    searchPlaceholder: 'Search songs by title or artist...',
    noSongsTitle: 'No songs yet',
    noSongsDesc: 'Create your first song to get started',
    createFirstSong: 'Create your first song',
    loading: 'Loading your songs...',
    songs: 'songs',
    song: 'song',
    inYourCollection: 'in your collection',
    sections: 'sections',
    section: 'section',
    justNow: 'just now',
    mAgo: 'm ago',
    hAgo: 'h ago',
    dAgo: 'd ago',
    howToTitle: 'How to use:',
    howTo1: '① Click "Add lyrics" below → type your song',
    howTo2: '② Click any word → pick a chord that appears above it',
    howTo3: '③ Click "View" to see the final result',
    chordTip: 'Tap any word in your lyrics to add a chord above it',
    helpTitle: 'Help & Tips',
    helpStep1Title: 'Create a song',
    helpStep1: 'Click "New Song", enter a title and select a language.',
    helpStep2Title: 'Add lyrics',
    helpStep2: 'Click "Add lyrics" inside any section. Type each line on a new line.',
    helpStep3Title: 'Add chords',
    helpStep3: 'Click any word in your lyrics. A chord picker will open — select a chord and press "Use [Chord]".',
    helpStep4Title: 'View & Perform',
    helpStep4: 'Toggle to "View" mode for a clean read-only display. Enable auto-scroll for hands-free performance.',
    helpStep5Title: 'Transpose',
    helpStep5: 'In song settings, use −1 / +1 to transpose all chords up or down by semitone.',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
  },
  he: {
    appName: 'מחברת שירים',
    myLibrary: 'הספרייה שלי',
    help: 'עזרה',
    signOut: 'התנתק',
    profile: 'הפרופיל שלי',
    language: 'שפה',
    newSong: '+ שיר חדש',
    import: 'ייבוא',
    searchPlaceholder: 'חפש שירים לפי שם או אמן...',
    noSongsTitle: 'אין שירים עדיין',
    noSongsDesc: 'צור את השיר הראשון שלך כדי להתחיל',
    createFirstSong: 'צור את השיר הראשון שלך',
    loading: 'טוען את השירים שלך...',
    songs: 'שירים',
    song: 'שיר',
    inYourCollection: 'באוסף שלך',
    sections: 'קטעים',
    section: 'קטע',
    justNow: 'עכשיו',
    mAgo: 'דק׳ לפני',
    hAgo: 'שע׳ לפני',
    dAgo: 'ימים לפני',
    howToTitle: 'איך משתמשים:',
    howTo1: '① לחץ על "הוסף מילים" → כתוב את השיר',
    howTo2: '② לחץ על כל מילה → בחר אקורד שיופיע מעליה',
    howTo3: '③ לחץ על "תצוגה" לתוצאה הסופית',
    chordTip: 'לחץ על כל מילה במילות השיר להוספת אקורד',
    helpTitle: 'עזרה וטיפים',
    helpStep1Title: 'יצירת שיר',
    helpStep1: 'לחץ על "שיר חדש", הכנס שם ובחר שפה.',
    helpStep2Title: 'הוספת מילים',
    helpStep2: 'לחץ על "הוסף מילים" בכל קטע. כתוב כל שורה בשורה חדשה.',
    helpStep3Title: 'הוספת אקורדים',
    helpStep3: 'לחץ על כל מילה. בוחר האקורדים ייפתח — בחר אקורד ולחץ על "השתמש".',
    helpStep4Title: 'תצוגה והופעה',
    helpStep4: 'עבור למצב "תצוגה" לתצוגה נקייה. הפעל גלילה אוטומטית.',
    helpStep5Title: 'טרנספוזיציה',
    helpStep5: 'בהגדרות השיר, השתמש ב−1 / +1 להזזת כל האקורדים חצי טון.',
    darkMode: 'מצב כהה',
    lightMode: 'מצב בהיר',
  },
} as const;

export type T = { readonly [K in keyof typeof translations.en]: string };

interface UILanguageContextValue {
  uiLang: UILang;
  setUiLang: (lang: UILang) => void;
  t: T;
}

const UILanguageContext = createContext<UILanguageContextValue>({
  uiLang: 'en',
  setUiLang: () => {},
  t: translations.en,
});

export function UILanguageProvider({ children }: { children: React.ReactNode }) {
  const [uiLang, setUiLang] = useState<UILang>(() => {
    return (localStorage.getItem('ui_lang') as UILang) || 'en';
  });

  function handleSetLang(lang: UILang) {
    setUiLang(lang);
    localStorage.setItem('ui_lang', lang);
  }

  return (
    <UILanguageContext.Provider value={{ uiLang, setUiLang: handleSetLang, t: translations[uiLang] }}>
      {children}
    </UILanguageContext.Provider>
  );
}

export function useUILanguage() {
  return useContext(UILanguageContext);
}
