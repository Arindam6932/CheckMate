import { io, type Socket } from 'socket.io-client';
import { auth, firebaseConfigured } from './firebase';

export async function connectMultiplayer(): Promise<Socket> {
  if (!firebaseConfigured || !auth?.currentUser) {
    throw new Error('Sign in with a configured CHECKMATE account before playing online.');
  }
  const token = await auth.currentUser.getIdToken();
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
  const socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
  return socket;
}
