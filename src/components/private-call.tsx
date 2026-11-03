import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Video } from 'lucide-react';
import type { Socket } from 'socket.io-client';

type Props = { socket: Socket | null; gameId: string };

export default function PrivateCall({ socket, gameId }: Props) {
  const [active, setActive] = useState(false);
  const [videoMode, setVideoMode] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [status, setStatus] = useState('Calls are private to the two players.');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const initiatorRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  function closePeer() {
    pcRef.current?.close();
    pcRef.current = null;
    setRemoteStream(null);
  }

  function stopMedia() {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    closePeer();
  }

  function createPeer() {
    if (!socket || !localStreamRef.current) throw new Error('Call media is not ready.');
    if (pcRef.current) return pcRef.current;
    const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    if (import.meta.env.VITE_TURN_URL && import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL) {
      iceServers.push({
        urls: import.meta.env.VITE_TURN_URL,
        username: import.meta.env.VITE_TURN_USERNAME,
        credential: import.meta.env.VITE_TURN_CREDENTIAL,
      });
    }
    const peer = new RTCPeerConnection({ iceServers });
    localStreamRef.current.getTracks().forEach(track => peer.addTrack(track, localStreamRef.current!));
    peer.onicecandidate = event => {
      if (event.candidate) socket.emit('call:signal', { gameId, signal: { candidate: event.candidate.toJSON() } });
    };
    peer.ontrack = event => setRemoteStream(event.streams[0] || null);
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setStatus('Private call connected.');
      else if (peer.connectionState === 'failed') setStatus('Call connection failed. A TURN relay may be required.');
      else if (peer.connectionState === 'disconnected') setStatus('Call connection interrupted.');
    };
    pcRef.current = peer;
    return peer;
  }

  async function startCall(withVideo: boolean) {
    if (!socket || !socket.connected) { setStatus('Connect to the game server before starting a call.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('This browser does not support secure audio/video calls.'); return; }
    try {
      setStatus('Requesting microphone permission…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: withVideo });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoMode(withVideo);
      setMicEnabled(true);
      setCameraEnabled(withVideo);
      setActive(true);
      setStatus('Waiting for your opponent to join the private call…');
      socket.emit('call:join', { gameId });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Microphone or camera permission was denied.');
      stopMedia();
    }
  }

  function endCall() {
    socket?.emit('call:leave', { gameId });
    stopMedia();
    setActive(false);
    setVideoMode(false);
    setMicEnabled(true);
    setCameraEnabled(false);
    setStatus('Call ended. Audio and video are off.');
  }

  function toggleMic() {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next; });
    setCameraEnabled(next);
  }

  useEffect(() => {
    if (!socket) return;
    const ready = async (data: { initiator: boolean }) => {
      initiatorRef.current = data.initiator;
      try { createPeer(); setStatus(data.initiator ? 'Waiting for the other player…' : 'Joining your opponent…'); }
      catch (error) { setStatus(error instanceof Error ? error.message : 'Could not prepare the call.'); }
    };
    const peerJoined = async () => {
      if (!initiatorRef.current || !pcRef.current) return;
      try {
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);
        socket.emit('call:signal', { gameId, signal: { description: pcRef.current.localDescription } });
      } catch { setStatus('Could not start the private call.'); }
    };
    const signal = async (data: { signal: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } }) => {
      const peer = pcRef.current;
      if (!peer) return;
      try {
        if (data.signal.description) {
          await peer.setRemoteDescription(data.signal.description);
          if (data.signal.description.type === 'offer') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit('call:signal', { gameId, signal: { description: peer.localDescription } });
          }
        } else if (data.signal.candidate) {
          await peer.addIceCandidate(data.signal.candidate);
        }
      } catch { setStatus('Could not negotiate the private call connection.'); }
    };
    const peerLeft = () => { closePeer(); setStatus('Your opponent left the call. Your microphone and camera remain on until you end the call.'); };
    socket.on('call:ready', ready);
    socket.on('call:peer-joined', peerJoined);
    socket.on('call:signal', signal);
    socket.on('call:peer-left', peerLeft);
    return () => {
      socket.off('call:ready', ready);
      socket.off('call:peer-joined', peerJoined);
      socket.off('call:signal', signal);
      socket.off('call:peer-left', peerLeft);
    };
  }, [socket, gameId]);

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => () => {
    socket?.emit('call:leave', { gameId });
    stopMedia();
  }, []);

  return <section className="private-call-panel">
    <div className="private-call-heading"><div><span className="online-eyebrow">PRIVATE PLAYER CALL</span><h3>Talk through the game</h3></div><span className="call-privacy">2 PLAYERS ONLY</span></div>
    {!active ? <><p className="private-call-note">Audio and video are off until you choose to start a call. Spectators cannot join.</p><div className="private-call-start"><button onClick={()=>void startCall(false)}><Phone size={15}/> Start voice call</button><button onClick={()=>void startCall(true)}><Video size={15}/> Start video call</button></div></> : <>
      <div className="private-call-status">{status}</div>
      <div className="private-call-videos">
        {videoMode && <video ref={localVideoRef} autoPlay muted playsInline className="local-video"/>}
        <video ref={remoteVideoRef} autoPlay playsInline className="remote-video"/>
        {!remoteStream && <div className="remote-placeholder"><span>♞</span><small>Waiting for opponent…</small></div>}
      </div>
      <div className="private-call-controls"><button onClick={toggleMic} className={!micEnabled?'muted':''}>{micEnabled?<Mic size={15}/>:<MicOff size={15}/>} {micEnabled?'Mute':'Unmute'}</button>{videoMode && <button onClick={toggleCamera} className={!cameraEnabled?'muted':''}>{cameraEnabled?<Camera size={15}/>:<CameraOff size={15}/>} {cameraEnabled?'Camera off':'Camera on'}</button>}<button className="end-call" onClick={endCall}><PhoneOff size={15}/> End call</button></div>
    </>}
  </section>;
}
