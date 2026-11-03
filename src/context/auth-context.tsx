import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile, type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePlayerName: (name: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const unavailable = () => new Error('Authentication is not configured yet. Add the CHECKMATE Firebase environment variables to enable accounts.');

async function savePlayerProfile(user: User, displayName?: string) {
  if (!db) throw unavailable();
  const profileRef = doc(db, 'players', user.uid);
  const existing = await getDoc(profileRef);
  const profileName = displayName || user.displayName || 'Player';
  if (existing.exists()) {
    await updateDoc(profileRef, {
      displayName: profileName,
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    });
    return;
  }
  await setDoc(profileRef, {
    uid: user.uid,
    displayName: profileName,
    email: user.email || '',
    photoURL: user.photoURL || '',
    emailVerified: user.emailVerified,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    profileVersion: 1,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, configured: firebaseConfigured,
    async signIn(email, password) {
      if (!auth) throw unavailable();
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await savePlayerProfile(credential.user);
    },
    async signUp(name, email, password) {
      if (!auth) throw unavailable();
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user);
      await savePlayerProfile(credential.user, name.trim());
      setUser(credential.user);
    },
    async signInWithGoogle() {
      if (!auth) throw unavailable();
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await savePlayerProfile(credential.user);
    },
    async resetPassword(email) {
      if (!auth) throw unavailable();
      await sendPasswordResetEmail(auth, email.trim());
    },
    async updatePlayerName(name) {
      if (!auth?.currentUser || !db) throw unavailable();
      const cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 30) throw new Error('Display name must be between 2 and 30 characters.');
      await updateProfile(auth.currentUser, { displayName: cleanName });
      await updateDoc(doc(db, 'players', auth.currentUser.uid), {
        displayName: cleanName,
        updatedAt: serverTimestamp(),
      });
      setUser({ ...auth.currentUser });
    },
    async resendVerification() {
      if (!auth?.currentUser) throw unavailable();
      if (auth.currentUser.emailVerified) return;
      await sendEmailVerification(auth.currentUser);
    },
    async logOut() {
      if (!auth) throw unavailable();
      await signOut(auth);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
