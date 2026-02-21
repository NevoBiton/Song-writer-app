const HEBREW_REGEX = /[\u0590-\u05FF]/;

export function isHebrew(text: string): boolean {
  return HEBREW_REGEX.test(text);
}

export function isRTLLine(text: string): boolean {
  const hebrewCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  return hebrewCount > latinCount;
}

export function getDir(text: string): 'rtl' | 'ltr' {
  return isRTLLine(text) ? 'rtl' : 'ltr';
}

export const HEBREW_SECTION_LABELS: Record<string, string> = {
  verse: 'בית',
  chorus: 'פזמון',
  bridge: 'גשר',
  intro: 'הקדמה',
  outro: 'אאוטרו',
  custom: 'קטע',
};
