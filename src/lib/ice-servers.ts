import { auth } from './firebase';

export async function getIceServers(): Promise<RTCIceServer[]> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Sign in before starting a private call.');
  const token = await user.getIdToken();
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
  const response = await fetch(`${serverUrl}/ice-servers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Could not load secure call connection settings.');
  const data = await response.json() as { iceServers: RTCIceServer[] };
  return data.iceServers;
}
