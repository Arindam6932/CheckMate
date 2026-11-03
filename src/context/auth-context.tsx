import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile, type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const unavailable = () => new Error('Authentication is not configured yet. Add the CHECKMATE Firebase environment variables to enable accounts.');

async function savePlayerProfile(user: User, displayName?: string) {
  if (!db) throw unavailable();
  await setDoc(doc(db, 'players', user.uid), {
    uid: user.uid,
    displayName: displayName || user.displayName || 'Player',
    email: user.email || '',
    photoURL: user.photoURL || '',
    emailVerified: user.emailVerified,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    profileVersion: 1,
  }, { merge: true });
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
