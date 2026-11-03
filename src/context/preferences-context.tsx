import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

export type Appearance = 'dark' | 'light' | 'system';
export type BackgroundStyle = 'aurora' | 'midnight' | 'forest' | 'plain' | 'custom';
export type Density = 'comfortable' | 'compact';

type PreferencesValue = {
  appearance: Appearance;
  isDark: boolean;
  boardTheme: string;
  pieceSet: string;
  soundEnabled: boolean;
  soundVolume: number;
  animationsEnabled: boolean;
  animationSpeed: number;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  compactMode: boolean;
  boardOrientation: 'white' | 'black';
  showMoveList: boolean;
  backgroundStyle: BackgroundStyle;
  customBackground: string;
  setCustomBackground: (value: string) => void;
  accentColor: string;
  customBoardColors: boolean;
  boardLightColor: string;
  boardDarkColor: string;
  pieceScale: number;
  boardCorners: number;
  setAppearance: (value: Appearance) => void;
  setBoardTheme: (value: string) => void;
  setPieceSet: (value: string) => void;
  setSoundEnabled: (value: boolean) => void;
  setSoundVolume: (value: number) => void;
  setAnimationsEnabled: (value: boolean) => void;
  setAnimationSpeed: (value: number) => void;
  setShowCoordinates: (value: boolean) => void;
  setShowLegalMoves: (value: boolean) => void;
  setHighlightLastMove: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setBoardOrientation: (value: 'white' | 'black') => void;
  setShowMoveList: (value: boolean) => void;
  setBackgroundStyle: (value: BackgroundStyle) => void;
  setAccentColor: (value: string) => void;
  setCustomBoardColors: (value: boolean) => void;
  setBoardLightColor: (value: string) => void;
  setBoardDarkColor: (value: string) => void;
  setPieceScale: (value: number) => void;
  setBoardCorners: (value: number) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);
const defaults = {
  appearance: 'dark' as Appearance, boardTheme: 'classic', pieceSet: 'classic',
  soundEnabled: true, soundVolume: 65, animationsEnabled: true, animationSpeed: 100,
  showCoordinates: true, showLegalMoves: true, highlightLastMove: true,
  compactMode: false, boardOrientation: 'white' as const, showMoveList: true,
  backgroundStyle: 'aurora' as BackgroundStyle, customBackground: '', accentColor: '#75d6a1',
  customBoardColors: false, boardLightColor: '#e9e8d9', boardDarkColor: '#56866c',
  pieceScale: 100, boardCorners: 9,
};
const readPreference = (key: string, fallback: string) => {
  try { return window.localStorage.getItem('checkmate.' + key) ?? fallback; }
  catch { return fallback; }
};
const readBool = (key: string, fallback: boolean) => readPreference(key, String(fallback)) === 'true';
const readNumber = (key: string, fallback: number, min: number, max: number) => {
  const value = Number(readPreference(key, String(fallback)));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const value = readPreference('appearance', defaults.appearance);
    return value === 'light' || value === 'system' ? value : 'dark';
  });
  const [boardTheme, setBoardTheme] = useState(() => readPreference('boardTheme', defaults.boardTheme));
  const [pieceSet, setPieceSet] = useState(() => readPreference('pieceSet', defaults.pieceSet));
  const [soundEnabled, setSoundEnabled] = useState(() => readBool('sound', defaults.soundEnabled));
  const [soundVolume, setSoundVolume] = useState(() => readNumber('soundVolume', defaults.soundVolume, 0, 100));
  const [animationsEnabled, setAnimationsEnabled] = useState(() => readBool('animations', defaults.animationsEnabled));
  const [animationSpeed, setAnimationSpeed] = useState(() => readNumber('animationSpeed', defaults.animationSpeed, 50, 150));
  const [showCoordinates, setShowCoordinates] = useState(() => readBool('coordinates', defaults.showCoordinates));
  const [showLegalMoves, setShowLegalMoves] = useState(() => readBool('legalMoves', defaults.showLegalMoves));
  const [highlightLastMove, setHighlightLastMove] = useState(() => readBool('lastMove', defaults.highlightLastMove));
  const [compactMode, setCompactMode] = useState(() => readBool('compactMode', defaults.compactMode));
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(() => readPreference('boardOrientation', defaults.boardOrientation) === 'black' ? 'black' : 'white');
  const [showMoveList, setShowMoveList] = useState(() => readBool('showMoveList', defaults.showMoveList));
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(() => {
    const value = readPreference('backgroundStyle', defaults.backgroundStyle);
    return ['aurora','midnight','forest','plain','custom'].includes(value) ? value as BackgroundStyle : defaults.backgroundStyle;
  });
  const [customBackground, setCustomBackground] = useState(() => readPreference('customBackground', defaults.customBackground));
  const [accentColor, setAccentColor] = useState(() => readPreference('accentColor', defaults.accentColor));
  const [customBoardColors, setCustomBoardColors] = useState(() => readBool('customBoardColors', defaults.customBoardColors));
  const [boardLightColor, setBoardLightColor] = useState(() => readPreference('boardLightColor', defaults.boardLightColor));
  const [boardDarkColor, setBoardDarkColor] = useState(() => readPreference('boardDarkColor', defaults.boardDarkColor));
  const [pieceScale, setPieceScale] = useState(() => readNumber('pieceScale', defaults.pieceScale, 80, 120));
  const [boardCorners, setBoardCorners] = useState(() => readNumber('boardCorners', defaults.boardCorners, 0, 24));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true);

  useEffect(() => {
    const values: Record<string, string> = {
      appearance, boardTheme, pieceSet, sound: String(soundEnabled), soundVolume: String(soundVolume),
      animations: String(animationsEnabled), animationSpeed: String(animationSpeed),
      coordinates: String(showCoordinates), legalMoves: String(showLegalMoves), lastMove: String(highlightLastMove),
      compactMode: String(compactMode), boardOrientation, showMoveList: String(showMoveList),
      backgroundStyle, customBackground, accentColor, customBoardColors: String(customBoardColors),
      boardLightColor, boardDarkColor, pieceScale: String(pieceScale), boardCorners: String(boardCorners),
    };
    try { Object.entries(values).forEach(([key, value]) => window.localStorage.setItem('checkmate.' + key, value)); }
    catch { /* Preferences remain available for this session if storage is unavailable. */ }
  }, [appearance, boardTheme, pieceSet, soundEnabled, soundVolume, animationsEnabled, animationSpeed,
    showCoordinates, showLegalMoves, highlightLastMove, compactMode, boardOrientation, showMoveList, backgroundStyle, customBackground, accentColor,
    customBoardColors, boardLightColor, boardDarkColor, pieceScale, boardCorners]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemDark(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const resetPreferences = () => {
    setAppearance(defaults.appearance); setBoardTheme(defaults.boardTheme); setPieceSet(defaults.pieceSet);
    setSoundEnabled(defaults.soundEnabled); setSoundVolume(defaults.soundVolume);
    setAnimationsEnabled(defaults.animationsEnabled); setAnimationSpeed(defaults.animationSpeed);
    setShowCoordinates(defaults.showCoordinates); setShowLegalMoves(defaults.showLegalMoves);
    setHighlightLastMove(defaults.highlightLastMove); setCompactMode(defaults.compactMode);
    setBoardOrientation(defaults.boardOrientation); setShowMoveList(defaults.showMoveList);
    setBackgroundStyle(defaults.backgroundStyle); setCustomBackground(defaults.customBackground); setAccentColor(defaults.accentColor);
    setCustomBoardColors(defaults.customBoardColors); setBoardLightColor(defaults.boardLightColor);
    setBoardDarkColor(defaults.boardDarkColor); setPieceScale(defaults.pieceScale); setBoardCorners(defaults.boardCorners);
  };

  const value = useMemo(() => ({
    appearance, isDark: appearance === 'dark' || (appearance === 'system' && systemDark),
    boardTheme, pieceSet, soundEnabled, soundVolume, animationsEnabled, animationSpeed,
    showCoordinates, showLegalMoves, highlightLastMove, compactMode, boardOrientation, showMoveList, backgroundStyle, customBackground, accentColor,
    customBoardColors, boardLightColor, boardDarkColor, pieceScale, boardCorners,
    setAppearance, setBoardTheme, setPieceSet, setSoundEnabled, setSoundVolume, setAnimationsEnabled,
    setAnimationSpeed, setShowCoordinates, setShowLegalMoves, setHighlightLastMove, setCompactMode,
    setBoardOrientation, setShowMoveList, setBackgroundStyle, setCustomBackground, setAccentColor, setCustomBoardColors, setBoardLightColor, setBoardDarkColor,
    setPieceScale, setBoardCorners, resetPreferences,
  }), [appearance, systemDark, boardTheme, pieceSet, soundEnabled, soundVolume, animationsEnabled,
    animationSpeed, showCoordinates, showLegalMoves, highlightLastMove, compactMode, boardOrientation, showMoveList, backgroundStyle,
    accentColor, customBackground, customBoardColors, boardLightColor, boardDarkColor, pieceScale, boardCorners]);

  const style = {
    '--user-accent': accentColor, '--board-light': boardLightColor, '--board-dark': boardDarkColor,
    '--piece-scale': pieceScale / 100, '--board-radius': boardCorners + 'px',
    '--animation-duration': animationSpeed * 1.8 + 'ms',
    '--custom-background-image': customBackground ? `url(${JSON.stringify(customBackground)})` : 'none',
  } as CSSProperties & Record<`--${string}`, string | number>;

  return <PreferencesContext.Provider value={value}>
    <div className="theme-root" style={style}>{children}</div>
  </PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}

export function ThemeFrame({ children }: { children: ReactNode }) {
  const { isDark, animationsEnabled, showCoordinates, showLegalMoves, highlightLastMove, compactMode, backgroundStyle, customBoardColors } = usePreferences();
  const classes = ['theme-root-frame', isDark ? 'dark' : 'light', animationsEnabled ? '' : 'motion-off',
    showCoordinates ? '' : 'hide-coordinates', showLegalMoves ? '' : 'hide-legal-hints',
    highlightLastMove ? '' : 'hide-last-move', compactMode ? 'compact-mode' : '',
    customBoardColors ? 'custom-board-colors' : '', 'background-' + backgroundStyle].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
