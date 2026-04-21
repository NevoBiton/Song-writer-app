import React, { createContext, useContext, useState } from 'react';

export type UILang = 'en' | 'he';

export const translations = {
  en: {
    // App
    appName: 'WordChord',
    // Nav
    myLibrary: 'My Library',
    help: 'Help',
    signOut: 'Sign Out',
    profile: 'My Profile',
    language: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    // Song list
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
    // Dialogs / actions
    cancel: 'Cancel',
    delete: 'Delete',
    deleteForever: 'Delete forever',
    deleteSongTitle: 'Delete song?',
    deleteForeverTitle: 'Delete forever?',
    moveToDeleted: 'will be moved to Recently Deleted. You can restore it within 30 days.',
    permanentlyDeleted: 'will be permanently deleted. This cannot be undone.',
    recentlyDeleted: 'Recently Deleted',
    restore: 'Restore',
    edit: 'Edit',
    duplicate: 'Duplicate',
    share: 'Share',
    noSongsMatch: 'No songs match',
    songTitle: 'Song title',
    create: 'Create',
    creating: 'Creating...',
    deleted: 'Deleted',
    expiresIn: 'expires in',
    // Song editor toolbar
    library: 'Library',
    untitled: 'Untitled',
    view: 'View',
    songSettings: 'Song settings',
    copyToClipboard: 'Copy song to clipboard',
    displayOptions: 'Display options',
    editMode: 'Edit',
    // Settings panel
    titleLabel: 'Title',
    artistLabel: 'Artist',
    keyLabel: 'Key',
    capoLabel: 'Capo',
    transposeLabel: 'Transpose',
    exportLabel: 'Export',
    copyChordPro: 'Copy ChordPro',
    songLanguage: 'Language',
    langEnglish: 'English',
    langHebrew: 'Hebrew / עברית',
    langMixed: 'Mixed',
    // View mode controls
    chordsLabel: 'Chords',
    autoScroll: 'Auto-scroll',
    // Section editor
    labelPlaceholder: 'Label...',
    removeSectionTitle: 'Remove section',
    addLyricsBtn: 'Add lyrics',
    tapToType: 'Tap to type your song words',
    editLyrics: 'Edit lyrics',
    addSection: 'Add section',
    deleteSectionTitle: 'Delete section?',
    deleteSectionDesc: 'and all its lyrics will be removed.',
    deleteSectionFallback: 'This section and all its lyrics will be removed.',
    // Section types
    sectionVerse: 'verse',
    sectionChorus: 'chorus',
    sectionBridge: 'bridge',
    sectionIntro: 'intro',
    sectionOutro: 'outro',
    sectionCustom: 'custom',
    // How-to hint
    howToTitle: 'How to use',
    howTo1: '① Tap "Add lyrics" below and type your song',
    howTo2: '② Tap any word to pick a chord above it',
    howTo3: '③ Tap "View" to see the final result',
    chordTip: 'Tap any word in your lyrics to add a chord above it',
    // Help dialog
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
    // Chord picker
    pickAChord: 'Pick a Chord',
    currentChordsLabel: 'Current chords',
    maxChordsReached: 'Maximum 5 chords reached — remove one to add another',
    chordSearchPlaceholder: 'Search or type slash chord (C/E)...',
    recentChords: 'Recent',
    favoritesLabel: 'Favorites',
    pickRootNote: 'Pick a root note',
    noChordsFound: 'No chords found',
    // Home page
    welcomeBack: 'Welcome back',
    keepWriting: 'Keep writing!',
    totalSongs: 'Total Songs',
    withChords: 'With Chords',
    recentlyEdited: 'Recently Edited',
    viewAll: 'View all →',
    startYourNotebook: 'Start your chord notebook by creating your first song',
    // Auth pages
    signInToAccount: 'Sign in to your account',
    createYourAccount: 'Create your account',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    usernameLabel: 'Username',
    confirmPasswordLabel: 'Confirm password',
    signingIn: 'Signing in…',
    signIn: 'Sign In',
    creatingAccount: 'Creating account…',
    createAccountBtn: 'Create Account',
    dontHaveAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    alreadyHaveAccount: 'Already have an account?',
    signInLink: 'Sign in',
  },
  he: {
    // App
    appName: 'WordChord',
    // Nav
    myLibrary: 'הספרייה שלי',
    help: 'עזרה',
    signOut: 'התנתק',
    profile: 'הפרופיל שלי',
    language: 'שפה',
    darkMode: 'מצב כהה',
    lightMode: 'מצב בהיר',
    // Song list
    newSong: 'שיר חדש',
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
    // Dialogs / actions
    cancel: 'ביטול',
    delete: 'מחק',
    deleteForever: 'מחק לצמיתות',
    deleteSongTitle: 'מחק שיר?',
    deleteForeverTitle: 'מחק לצמיתות?',
    moveToDeleted: 'יועבר לנמחקים לאחרונה. ניתן לשחזר תוך 30 יום.',
    permanentlyDeleted: 'יימחק לצמיתות. לא ניתן לבטל פעולה זו.',
    recentlyDeleted: 'נמחק לאחרונה',
    restore: 'שחזר',
    edit: 'עריכה',
    duplicate: 'שכפל',
    share: 'שתף',
    noSongsMatch: 'לא נמצאו שירים עבור',
    songTitle: 'שם השיר',
    create: 'צור',
    creating: 'יוצר...',
    deleted: 'נמחק',
    expiresIn: 'פג תוקף בעוד',
    // Song editor toolbar
    library: 'ספרייה',
    untitled: 'ללא שם',
    view: 'תצוגה',
    songSettings: 'הגדרות שיר',
    copyToClipboard: 'העתק שיר ללוח',
    displayOptions: 'אפשרויות תצוגה',
    editMode: 'עריכה',
    // Settings panel
    titleLabel: 'כותרת',
    artistLabel: 'אמן',
    keyLabel: 'גמא',
    capoLabel: 'קאפו',
    transposeLabel: 'טרנספוזיציה',
    exportLabel: 'יצוא',
    copyChordPro: 'העתק ChordPro',
    songLanguage: 'שפה',
    langEnglish: 'English',
    langHebrew: 'Hebrew / עברית',
    langMixed: 'מעורב',
    // View mode controls
    chordsLabel: 'אקורדים',
    autoScroll: 'גלילה אוטומטית',
    // Section editor
    labelPlaceholder: 'תווית...',
    removeSectionTitle: 'הסר קטע',
    addLyricsBtn: 'הוסף מילים',
    tapToType: 'לחץ לכתוב מילות השיר',
    editLyrics: 'עריכת מילים',
    addSection: 'הוסף קטע',
    deleteSectionTitle: 'מחק קטע?',
    deleteSectionDesc: 'וכל המילים שלו יימחקו.',
    deleteSectionFallback: 'קטע זה וכל המילים שלו יימחקו.',
    // Section types
    sectionVerse: 'בית',
    sectionChorus: 'פזמון',
    sectionBridge: 'גשר',
    sectionIntro: 'פתיחה',
    sectionOutro: 'סיום',
    sectionCustom: 'מותאם',
    // How-to hint
    howToTitle: 'איך משתמשים',
    howTo1: '① לחץ על "הוסף מילים" וכתוב את השיר',
    howTo2: '② לחץ על כל מילה לבחירת אקורד מעליה',
    howTo3: '③ לחץ על "תצוגה" לתוצאה הסופית',
    chordTip: 'לחץ על כל מילה במילות השיר להוספת אקורד',
    // Help dialog
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
    // Chord picker
    pickAChord: 'בחר אקורד',
    currentChordsLabel: 'אקורדים נוכחיים',
    maxChordsReached: 'הגעת ל-5 אקורדים — הסר אחד כדי להוסיף',
    chordSearchPlaceholder: 'חפש אקורד...',
    recentChords: 'אחרונים',
    favoritesLabel: 'מועדפים',
    pickRootNote: 'בחר שורש',
    noChordsFound: 'לא נמצאו אקורדים',
    // Home page
    welcomeBack: 'ברוך הבא',
    keepWriting: 'המשך לכתוב!',
    totalSongs: 'סה"כ שירים',
    withChords: 'עם אקורדים',
    recentlyEdited: 'נערך לאחרונה',
    viewAll: '← הצג הכל',
    startYourNotebook: 'התחל את פנקס האקורדים שלך על ידי יצירת השיר הראשון',
    // Auth pages
    signInToAccount: 'התחבר לחשבון שלך',
    createYourAccount: 'צור חשבון חדש',
    emailLabel: 'אימייל',
    passwordLabel: 'סיסמה',
    usernameLabel: 'שם משתמש',
    confirmPasswordLabel: 'אמת סיסמה',
    signingIn: 'מתחבר...',
    signIn: 'התחבר',
    creatingAccount: 'יוצר חשבון...',
    createAccountBtn: 'צור חשבון',
    dontHaveAccount: 'אין לך חשבון?',
    signUpLink: 'הירשם',
    alreadyHaveAccount: 'כבר יש לך חשבון?',
    signInLink: 'התחבר',
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
