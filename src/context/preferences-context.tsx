import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Appearance = 'dark' | 'light' | 'system';
type PreferencesValue = {
  appearance: Appearance;
  isDark: boolean;
  boardTheme: string;
  pieceSet: string;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  setAppearance: (value: Appearance) => void;
  setBoardTheme: (value: string) => void;
  setPieceSet: (value: string) => void;
  setSoundEnabled: (value: boolean) => void;
  setAnimationsEnabled: (value: boolean) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);
const readPreference = (key: string, fallback: string) => {
  try { return window.localStorage.getItem(key) || fallback; }
  catch { return fallback; }
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const value = readPreference('checkmate.appearance', 'dark');
    return value === 'light' || value === 'system' ? value : 'dark';
  });
  const [boardTheme, setBoardTheme] = useState(() => readPreference('checkmate.boardTheme', 'classic'));
  const [pieceSet, setPieceSet] = useState(() => readPreference('checkmate.pieceSet', 'classic'));
  const [soundEnabled, setSoundEnabled] = useState(() => readPreference('checkmate.sound', 'true') === 'true');
  const [animationsEnabled, setAnimationsEnabled] = useState(() => readPreference('checkmate.animations', 'true') === 'true');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);

  useEffect(() => {
    try {
      window.localStorage.setItem('checkmate.appearance', appearance);
      window.localStorage.setItem('checkmate.boardTheme', boardTheme);
      window.localStorage.setItem('checkmate.pieceSet', pieceSet);
      window.localStorage.setItem('checkmate.sound', String(soundEnabled));
      window.localStorage.setItem('checkmate.animations', String(animationsEnabled));
    } catch { /* Preferences remain usable for this session if storage is unavailable. */ }
  }, [appearance, boardTheme, pieceSet, soundEnabled, animationsEnabled]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const value = useMemo(() => ({
    appearance,
    isDark: appearance === 'dark' || (appearance === 'system' && systemDark),
    boardTheme, pieceSet, soundEnabled, animationsEnabled,
    setAppearance, setBoardTheme, setPieceSet, setSoundEnabled, setAnimationsEnabled,
  }), [appearance, systemDark, boardTheme, pieceSet, soundEnabled, animationsEnabled]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}

export function ThemeFrame({ children }: { children: ReactNode }) {
  const { isDark } = usePreferences();
  return <div className={isDark ? 'theme-root' : 'theme-root light'}>{children}</div>;
}
