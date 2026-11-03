import { io, type Socket } from 'socket.io-client';
import { auth, firebaseConfigured } from './firebase';

export async function connectMultiplayer(): Promise<Socket> {
  const currentUser = auth?.currentUser;
  if (!firebaseConfigured || !currentUser) {
    throw new Error('Sign in with a configured CHECKMATE account before playing online.');
  }
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
  return io(serverUrl, {
    auth: callback => {
      void currentUser.getIdToken().then(token => callback({ token })).catch(() => callback({ token: '' }));
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
  });
}
