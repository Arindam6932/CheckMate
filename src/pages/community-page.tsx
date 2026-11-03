import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { ArrowLeft, Check, Copy, MessageCircle, Send, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { db } from '../lib/firebase';

type FriendRecord = { id: string; members: string[]; requestId: string };
type RequestRecord = { id: string; fromUid: string; toUid: string; status: 'pending' | 'accepted' | 'rejected' };
type PublicProfile = { uid: string; displayName: string; photoURL?: string };
type ChatMessage = { id: string; senderUid: string; text: string; createdAt?: { toDate: () => Date } };
const pairId = (a: string, b: string) => [a,b].sort().join('_');

export default function CommunityPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [incoming, setIncoming] = useState<RequestRecord[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRecord[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [targetId, setTargetId] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?mode=login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !db) return;
    const friendQuery = query(collection(db, 'friends'), where('members', 'array-contains', user.uid));
    const incomingQuery = query(collection(db, 'friendRequests'), where('toUid', '==', user.uid));
    const outgoingQuery = query(collection(db, 'friendRequests'), where('fromUid', '==', user.uid));
    const stopFriends = onSnapshot(friendQuery, snap => setFriends(snap.docs.map(item => ({ ...item.data(), id: item.id } as FriendRecord))), err => setError(err.message));
    const stopIncoming = onSnapshot(incomingQuery, snap => setIncoming(snap.docs.map(item => ({ ...item.data(), id: item.id } as RequestRecord)).filter(item => item.status === 'pending')), err => setError(err.message));
    const stopOutgoing = onSnapshot(outgoingQuery, snap => setOutgoing(snap.docs.map(item => ({ ...item.data(), id: item.id } as RequestRecord)).filter(item => item.status === 'pending')), err => setError(err.message));
    return () => { stopFriends(); stopIncoming(); stopOutgoing(); };
  }, [user]);

  const relatedIds = useMemo(() => {
    if (!user) return [];
    const ids = new Set<string>();
    friends.forEach(friend => friend.members.forEach(uid => { if (uid !== user.uid) ids.add(uid); }));
    incoming.forEach(item => ids.add(item.fromUid));
    outgoing.forEach(item => ids.add(item.toUid));
    if (selectedFriend) ids.add(selectedFriend.uid);
    return [...ids];
  }, [friends, incoming, outgoing, selectedFriend, user]);

  useEffect(() => {
    if (!db || relatedIds.length === 0) return;
    let active = true;
    Promise.all(relatedIds.map(async uid => {
      const snap = await getDoc(doc(db!, 'publicProfiles', uid));
      return snap.exists() ? [uid, snap.data() as PublicProfile] as const : null;
    })).then(items => {
      if (!active) return;
      setProfiles(current => {
        const next = { ...current };
        items.forEach(item => { if (item) next[item[0]] = item[1]; });
        return next;
      });
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load player profiles.'); });
    return () => { active = false; };
  }, [relatedIds]);

  useEffect(() => {
    if (!user || !selectedFriend || !db) { setMessages([]); return; }
    const conversationId = pairId(user.uid, selectedFriend.uid);
    const messagesQuery = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100),
    );
    return onSnapshot(messagesQuery, snap => {
      setMessages(snap.docs.map(item => ({ ...item.data(), id: item.id } as ChatMessage)));
    }, err => setError(err.message));
  }, [user, selectedFriend]);

  async function sendRequest(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    if (!user || !db) return;
    const recipient = targetId.trim();
    if (!recipient || recipient === user.uid) { setError('Enter another player’s ID.'); return; }
    setBusy(true);
    try {
      const profile = await getDoc(doc(db, 'publicProfiles', recipient));
      if (!profile.exists()) throw new Error('No CHECKMATE player was found with that ID.');
      const id = pairId(user.uid, recipient);
      const existing = await getDoc(doc(db, 'friendRequests', id));
      if (existing.exists()) {
        const data = existing.data();
        if (data.status === 'accepted') throw new Error('You are already connected.');
        if (data.status === 'pending') throw new Error(data.fromUid === user.uid ? 'A request is already pending.' : 'This player has already sent you a request.');
        throw new Error('A previous request for this player was declined.');
      }
      await setDoc(doc(db, 'friendRequests', id), {
        fromUid: user.uid, toUid: recipient, status: 'pending',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setTargetId(''); setNotice('Friend request sent.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the friend request.'); }
    finally { setBusy(false); }
  }

  async function respondToRequest(request: RequestRecord, accept: boolean) {
    if (!db || !user) return;
    setError(''); setNotice('');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'friendRequests', request.id), {
        status: accept ? 'accepted' : 'rejected',
        updatedAt: serverTimestamp(),
      });
      if (accept) {
        batch.set(doc(db, 'friends', request.id), {
          members: [request.fromUid, request.toUid].sort(),
          requestId: request.id,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setNotice(accept ? 'Friend added. You can now message each other.' : 'Friend request declined.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update the friend request.'); }
  }

  async function removeFriend(friend: FriendRecord) {
    if (!db || !user) return;
    if (!window.confirm('Remove this player from your friends?')) return;
    try {
      await deleteDoc(doc(db, 'friends', friend.id));
      if (selectedFriend && friend.members.includes(selectedFriend.uid)) setSelectedFriend(null);
      setNotice('Friend removed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this friend.'); }
  }

  async function openChat(profile: PublicProfile) {
    if (!db || !user) return;
    setError('');
    const id = pairId(user.uid, profile.uid);
    try {
      const conversationRef = doc(db, 'conversations', id);
      const conversation = await getDoc(conversationRef);
      if (!conversation.exists()) {
        await setDoc(conversationRef, {
          members: [user.uid, profile.uid].sort(),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          lastMessage: '', lastMessageAt: serverTimestamp(),
        });
      }
      setSelectedFriend(profile);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open this conversation.'); }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!db || !user || !selectedFriend || !draft.trim()) return;
    const text = draft.trim();
    if (text.length > 2000) { setError('Messages must be 2,000 characters or fewer.'); return; }
    const conversationId = pairId(user.uid, selectedFriend.uid);
    setDraft(''); setError('');
    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderUid: user.uid, text, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.slice(0, 120),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) { setDraft(text); setError(err instanceof Error ? err.message : 'Could not send your message.'); }
  }

  if (loading || !user) return <main className="community-loading">Loading your community…</main>;

  return <main className="community-screen">
    <header className="community-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><div className="community-me"><span>PLAYER ID</span><b>{user.uid.slice(0,10)}…</b><button onClick={()=>{void navigator.clipboard?.writeText(user.uid);setCopied(true);}}>{copied?<Check size={13}/>:<Copy size={13}/>}</button></div></header>
    <section className="community-content">
      <div className="community-title"><div className="community-title-icon"><Users size={22}/></div><div><span className="online-eyebrow">THE CHECKMATE CLUBHOUSE</span><h1>Community</h1><p>Build your chess circle and talk between games.</p></div></div>
      {(error || notice) && <div className={error?'community-error':'community-notice'}>{error || notice}</div>}
      <div className="community-grid">
        <aside className="community-sidebar">
          <form className="add-friend-form" onSubmit={sendRequest}><label>ADD A PLAYER</label><div><input value={targetId} onChange={e=>setTargetId(e.target.value)} placeholder="Paste player ID" required/><button type="submit" disabled={busy}><UserPlus size={15}/></button></div><small>Ask your friend to copy their Player ID from their profile.</small></form>
          <div className="community-list-section"><div className="community-section-title">FRIEND REQUESTS <span>{incoming.length}</span></div>{incoming.length===0?<p className="community-muted">No incoming requests.</p>:incoming.map(request=>{const profile=profiles[request.fromUid];return <div className="request-row" key={request.id}><div className="community-avatar">{(profile?.displayName||'P').charAt(0).toUpperCase()}</div><div className="request-name"><b>{profile?.displayName||'CHECKMATE player'}</b><small>{request.fromUid.slice(0,9)}…</small></div><button title="Accept" onClick={()=>void respondToRequest(request,true)}><Check size={14}/></button><button title="Decline" onClick={()=>void respondToRequest(request,false)}><X size={14}/></button></div>;})}</div>
          <div className="community-list-section"><div className="community-section-title">YOUR FRIENDS <span>{friends.length}</span></div>{friends.length===0?<p className="community-muted">Your chess circle starts here.</p>:friends.map(friend=>{const friendUid=friend.members.find(uid=>uid!==user.uid)||'';const profile=profiles[friendUid];return <div className={selectedFriend?.uid===friendUid?'friend-row selected':'friend-row'} key={friend.id}><button className="friend-main" onClick={()=>profile&&void openChat(profile)}><div className="community-avatar">{(profile?.displayName||'P').charAt(0).toUpperCase()}</div><span><b>{profile?.displayName||'CHECKMATE player'}</b><small>{friendUid.slice(0,9)}…</small></span></button><button className="friend-remove" title="Remove friend" onClick={()=>void removeFriend(friend)}><X size={13}/></button></div>;})}</div>
          {outgoing.length>0 && <div className="community-list-section"><div className="community-section-title">SENT REQUESTS <span>{outgoing.length}</span></div>{outgoing.map(request=><div className="outgoing-row" key={request.id}><span>{profiles[request.toUid]?.displayName||request.toUid.slice(0,9)+'…'}</span><small>Pending</small></div>)}</div>}
        </aside>
        <section className="community-chat">
          {selectedFriend ? <>
            <div className="chat-heading"><div className="community-avatar">{selectedFriend.displayName.charAt(0).toUpperCase()}</div><div><b>{selectedFriend.displayName}</b><small>CHECKMATE friend</small></div></div>
            <div className="chat-messages">{messages.length===0?<div className="chat-empty"><MessageCircle size={25}/><b>Say hello.</b><span>This is the start of your conversation.</span></div>:messages.map(message=><div className={message.senderUid===user.uid?'chat-message mine':'chat-message'} key={message.id}><p>{message.text}</p><small>{message.createdAt?.toDate().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})||'Sending…'}</small></div>)}</div>
            <form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" maxLength={2000}/><button type="submit" disabled={!draft.trim()}><Send size={16}/></button></form>
          </>:<div className="chat-empty chat-welcome"><MessageCircle size={34}/><b>Your chess conversations.</b><span>Select a friend to message them. Messages are private to the two conversation members.</span></div>}
        </section>
      </div>
    </section>
  </main>;
}
