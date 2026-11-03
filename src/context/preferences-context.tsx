import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';

export type Appearance = 'dark' | 'light' | 'system';
export type BackgroundStyle = 'aurora' | 'midnight' | 'forest' | 'plain' | 'custom';
export type SyncStatus = 'loading' | 'synced' | 'saving' | 'error' | 'signed-out';

type PreferenceState = {
  appearance: Appearance; boardTheme: string; pieceSet: string;
  soundEnabled: boolean; soundVolume: number; animationsEnabled: boolean; animationSpeed: number;
  showCoordinates: boolean; showLegalMoves: boolean; highlightLastMove: boolean;
  compactMode: boolean; boardOrientation: 'white' | 'black'; showMoveList: boolean;
  backgroundStyle: BackgroundStyle; customBackground: string; accentColor: string;
  customBoardColors: boolean; boardLightColor: string; boardDarkColor: string;
  pieceScale: number; boardCorners: number;
};
type PreferencesValue = PreferenceState & {
  isDark: boolean; syncStatus: SyncStatus; signedIn: boolean;
  setAppearance: (value: Appearance) => void; setBoardTheme: (value: string) => void;
  setPieceSet: (value: string) => void; setSoundEnabled: (value: boolean) => void;
  setSoundVolume: (value: number) => void; setAnimationsEnabled: (value: boolean) => void;
  setAnimationSpeed: (value: number) => void; setShowCoordinates: (value: boolean) => void;
  setShowLegalMoves: (value: boolean) => void; setHighlightLastMove: (value: boolean) => void;
  setCompactMode: (value: boolean) => void; setBoardOrientation: (value: 'white' | 'black') => void;
  setShowMoveList: (value: boolean) => void; setBackgroundStyle: (value: BackgroundStyle) => void;
  setCustomBackground: (value: string) => void; uploadCustomBackground: (file: File) => Promise<void>;
  removeCustomBackground: () => Promise<void>;
  setAccentColor: (value: string) => void; setCustomBoardColors: (value: boolean) => void;
  setBoardLightColor: (value: string) => void; setBoardDarkColor: (value: string) => void;
  setPieceScale: (value: number) => void; setBoardCorners: (value: number) => void;
  resetPreferences: () => Promise<void>;
};

const defaults: PreferenceState = {
  appearance: 'dark', boardTheme: 'classic', pieceSet: 'classic',
  soundEnabled: true, soundVolume: 65, animationsEnabled: true, animationSpeed: 100,
  showCoordinates: true, showLegalMoves: true, highlightLastMove: true,
  compactMode: false, boardOrientation: 'white', showMoveList: true,
  backgroundStyle: 'aurora', customBackground: '', accentColor: '#75d6a1',
  customBoardColors: false, boardLightColor: '#e9e8d9', boardDarkColor: '#56866c',
  pieceScale: 100, boardCorners: 9,
};
const PreferencesContext = createContext<PreferencesValue | null>(null);
const settingsRef = (uid: string) => doc(db!, 'players', uid, 'settings', 'preferences');

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<PreferenceState>(defaults);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true);
  const [uid, setUid] = useState<string | null>(null);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [backgroundPath, setBackgroundPath] = useState('');

  const update = <K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) =>
    setPrefs(current => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!auth) { setSyncStatus('error'); return; }
    return onAuthStateChanged(auth, user => {
      setUid(user?.uid ?? null);
      setLoadedUid(null);
      setBackgroundPath('');
      if (!user) { setPrefs(defaults); setSyncStatus('signed-out'); }
      else setSyncStatus('loading');
    });
  }, []);

  useEffect(() => {
    if (!uid || !db) return;
    const refDoc = settingsRef(uid);
    return onSnapshot(refDoc, snapshot => {
      const data = snapshot.data() || {};
      setPrefs({
        ...defaults,
        ...data,
        customBackground: typeof data.customBackgroundUrl === 'string' ? data.customBackgroundUrl : '',
      } as PreferenceState);
      setBackgroundPath(typeof data.customBackgroundPath === 'string' ? data.customBackgroundPath : '');
      setLoadedUid(uid);
      setSyncStatus('synced');
    }, error => {
      console.error('Could not load account preferences:', error);
      setSyncStatus('error');
    });
  }, [uid]);

  useEffect(() => {
    if (!uid || loadedUid !== uid || !db) return;
    const timer = window.setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const { customBackground, ...rest } = prefs;
        await setDoc(settingsRef(uid), {
          ...rest,
          customBackgroundUrl: customBackground,
          customBackgroundPath: backgroundPath,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setSyncStatus('synced');
      } catch (error) {
        console.error('Could not save account preferences:', error);
        setSyncStatus('error');
      }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [prefs, uid, loadedUid, backgroundPath]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const updateSystem = () => setSystemDark(media.matches);
    media.addEventListener?.('change', updateSystem);
    return () => media.removeEventListener?.('change', updateSystem);
  }, []);

  async function uploadCustomBackground(file: File) {
    const user = auth?.currentUser;
    if (!user || !storage || !db) throw new Error('Sign in to upload and sync a background image.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80) || 'background';
    const path = `players/${user.uid}/backgrounds/${Date.now()}-${safeName}`;
    const uploaded = ref(storage, path);
    await uploadBytes(uploaded, file, { contentType: file.type, cacheControl: 'public,max-age=3600' });
    const url = await getDownloadURL(uploaded);
    const oldPath = backgroundPath;
    await setDoc(settingsRef(user.uid), {
      customBackgroundUrl: url, customBackgroundPath: path, backgroundStyle: 'custom',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setBackgroundPath(path);
    setPrefs(current => ({ ...current, customBackground: url, backgroundStyle: 'custom' }));
    if (oldPath && oldPath !== path) {
      try { await deleteObject(ref(storage, oldPath)); } catch { /* Old image cleanup can be retried separately. */ }
    }
    setSyncStatus('synced');
  }

  async function removeCustomBackground() {
    const user = auth?.currentUser;
    if (!user || !storage || !db) throw new Error('Sign in to manage your background image.');
    const oldPath = backgroundPath;
    await setDoc(settingsRef(user.uid), {
      customBackgroundUrl: '', customBackgroundPath: '', backgroundStyle: 'aurora',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setBackgroundPath('');
    setPrefs(current => ({ ...current, customBackground: '', backgroundStyle: 'aurora' }));
    if (oldPath) {
      try { await deleteObject(ref(storage, oldPath)); } catch { /* Missing old object is already removed. */ }
    }
    setSyncStatus('synced');
  }

  async function resetPreferences() {
    const user = auth?.currentUser;
    if (!user || !db) throw new Error('Sign in to reset your account preferences.');
    await setDoc(settingsRef(user.uid), { ...defaults, customBackgroundUrl: '', customBackgroundPath: '', updatedAt: serverTimestamp() });
    const oldPath = backgroundPath;
    setPrefs(defaults); setBackgroundPath('');
    if (oldPath && storage) {
      try { await deleteObject(ref(storage, oldPath)); } catch { /* Missing object is already removed. */ }
    }
    setSyncStatus('synced');
  }

  const value = useMemo<PreferencesValue>(() => ({
    ...prefs,
    isDark: prefs.appearance === 'dark' || (prefs.appearance === 'system' && systemDark),
    syncStatus, signedIn: Boolean(uid),
    setAppearance: value => update('appearance', value),
    setBoardTheme: value => update('boardTheme', value),
    setPieceSet: value => update('pieceSet', value),
    setSoundEnabled: value => update('soundEnabled', value),
    setSoundVolume: value => update('soundVolume', Math.max(0, Math.min(100, value))),
    setAnimationsEnabled: value => update('animationsEnabled', value),
    setAnimationSpeed: value => update('animationSpeed', Math.max(50, Math.min(150, value))),
    setShowCoordinates: value => update('showCoordinates', value),
    setShowLegalMoves: value => update('showLegalMoves', value),
    setHighlightLastMove: value => update('highlightLastMove', value),
    setCompactMode: value => update('compactMode', value),
    setBoardOrientation: value => update('boardOrientation', value),
    setShowMoveList: value => update('showMoveList', value),
    setBackgroundStyle: value => update('backgroundStyle', value),
    setCustomBackground: value => update('customBackground', value),
    uploadCustomBackground, removeCustomBackground,
    setAccentColor: value => update('accentColor', value),
    setCustomBoardColors: value => update('customBoardColors', value),
    setBoardLightColor: value => update('boardLightColor', value),
    setBoardDarkColor: value => update('boardDarkColor', value),
    setPieceScale: value => update('pieceScale', Math.max(80, Math.min(120, value))),
    setBoardCorners: value => update('boardCorners', Math.max(0, Math.min(24, value))),
    resetPreferences,
  }), [prefs, systemDark, syncStatus, uid, backgroundPath]);

  const style = {
    '--user-accent': prefs.accentColor, '--board-light': prefs.boardLightColor, '--board-dark': prefs.boardDarkColor,
    '--piece-scale': prefs.pieceScale / 100, '--board-radius': prefs.boardCorners + 'px',
    '--animation-duration': prefs.animationSpeed * 1.8 + 'ms',
    '--custom-background-image': prefs.customBackground ? `url("${prefs.customBackground}")` : 'none',
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
