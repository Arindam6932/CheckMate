import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc, where, query } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, Crown, Flag, Plus, Trophy, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { db } from '../lib/firebase';

type Tournament = {
  id: string;
  name: string;
  description: string;
  format: string;
  timeControl: string;
  capacity: number;
  startsAt: Timestamp;
  status: 'open' | 'closed';
  createdBy: string;
};

export default function TournamentsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Tournament[]>([]);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('Arena');
  const [timeControl, setTimeControl] = useState('5+0');
  const [capacity, setCapacity] = useState('32');
  const [startsAt, setStartsAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/auth?mode=login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!db || !user) return;
    const eventsQuery = query(collection(db, 'tournaments'), where('status', '==', 'open'));
    return onSnapshot(eventsQuery, snap => {
      const items = snap.docs.map(item => ({ ...item.data(), id: item.id } as Tournament));
      items.sort((a,b)=>a.startsAt.toMillis()-b.startsAt.toMillis());
      setEvents(items);
    }, err => setError(err.message));
  }, [user]);

  useEffect(() => {
    if (!db || !user || events.length === 0) return;
    let active = true;
    Promise.all(events.map(async event => {
      const participant = await getDoc(doc(db!, 'tournaments', event.id, 'participants', user.uid));
      return [event.id, participant.exists()] as const;
    })).then(items => {
      if (active) setJoined(current => ({ ...current, ...Object.fromEntries(items) }));
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not check registration.'); });
    return () => { active = false; };
  }, [events, user]);

  async function createTournament(event: FormEvent) {
    event.preventDefault(); if (!db || !user) return;
    setError(''); setNotice('');
    if (name.trim().length < 3) { setError('Tournament name must be at least 3 characters.'); return; }
    if (!startsAt || new Date(startsAt).getTime() <= Date.now()) { setError('Choose a future start date and time.'); return; }
    setBusy(true);
    try {
      const ref = doc(collection(db, 'tournaments'));
      await setDoc(ref, {
        name: name.trim(), description: description.trim(), format, timeControl,
        capacity: Number(capacity), startsAt: Timestamp.fromDate(new Date(startsAt)),
        status: 'open', createdBy: user.uid, createdAt: serverTimestamp(),
      });
      setShowCreate(false); setName(''); setDescription(''); setNotice('Tournament created. Players can now register.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create the tournament.'); }
    finally { setBusy(false); }
  }

  async function register(event: Tournament) {
    if (!db || !user) return;
    setError(''); setNotice('');
    try {
      await setDoc(doc(db, 'tournaments', event.id, 'participants', user.uid), {
        uid: user.uid, displayName: user.displayName || 'Player', joinedAt: serverTimestamp(),
      });
      setJoined(current => ({ ...current, [event.id]: true }));
      setNotice('You are registered for ' + event.name + '.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not register for this tournament.'); }
  }

  async function withdraw(event: Tournament) {
    if (!db || !user) return;
    try {
      await deleteDoc(doc(db, 'tournaments', event.id, 'participants', user.uid));
      setJoined(current => ({ ...current, [event.id]: false }));
      setNotice('You have withdrawn from ' + event.name + '.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not withdraw from this tournament.'); }
  }

  async function closeTournament(event: Tournament) {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'tournaments', event.id), { status: 'closed' });
      setNotice('Tournament registration closed.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not close registration.'); }
  }

  if (loading || !user) return <main className="tournaments-loading">Loading tournaments…</main>;

  return <main className="tournaments-screen">
    <header className="tournaments-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">COMPETE TOGETHER</span></header>
    <section className="tournaments-content">
      <div className="tournaments-hero"><div className="tournaments-icon"><Trophy size={23}/></div><div><span className="online-eyebrow">THE COMPETITIVE ARENA</span><h1>Tournaments</h1><p>Find an event, join the field, and put your preparation to the test.</p></div><button className="create-tournament-button" onClick={()=>setShowCreate(!showCreate)}><Plus size={16}/> Create event</button></div>
      {error && <div className="tournament-error">{error}</div>}{notice && <div className="tournament-notice">{notice}</div>}
      {showCreate && <form className="create-tournament-form" onSubmit={createTournament}><div className="form-heading"><b>Create a tournament</b><small>Set up an event for the CHECKMATE community.</small></div><label>EVENT NAME<input value={name} onChange={e=>setName(e.target.value)} maxLength={60} required placeholder="e.g. Friday Night Blitz"/></label><label>DESCRIPTION<textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={300} rows={2} placeholder="A short description of the event"/></label><div className="tournament-form-grid"><label>FORMAT<select value={format} onChange={e=>setFormat(e.target.value)}><option>Arena</option><option>Swiss</option><option>Round robin</option><option>Knockout</option></select></label><label>TIME CONTROL<select value={timeControl} onChange={e=>setTimeControl(e.target.value)}><option value="3+0">3 + 0 · Blitz</option><option value="5+0">5 + 0 · Blitz</option><option value="10+0">10 + 0 · Rapid</option><option value="15+10">15 + 10 · Rapid</option><option value="30+0">30 + 0 · Classical</option></select></label><label>PLAYER CAPACITY<input type="number" min="2" max="256" value={capacity} onChange={e=>setCapacity(e.target.value)} required/></label><label>START DATE & TIME<input type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></label></div><div className="tournament-form-actions"><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button><button type="submit" disabled={busy}>{busy?'Creating…':'Create tournament'}</button></div></form>}
      <div className="tournament-list-heading"><div><span className="online-eyebrow">OPEN REGISTRATION</span><h2>Upcoming events</h2></div><span>{events.length} EVENTS</span></div>
      {events.length===0 ? <div className="tournaments-empty"><Trophy size={36}/><b>No open tournaments yet.</b><span>Create an event or check back when the community schedules one.</span></div> : <div className="tournament-grid">{events.map(event=><article className="tournament-card" key={event.id}><div className="tournament-card-top"><span className="tournament-format"><Crown size={13}/>{event.format}</span><span className="tournament-open">REGISTRATION OPEN</span></div><h3>{event.name}</h3><p>{event.description || 'A CHECKMATE community tournament.'}</p><div className="tournament-facts"><span><Flag size={14}/>{event.timeControl}</span><span><Users size={14}/>{event.capacity} target capacity</span><span><CalendarDays size={14}/>{event.startsAt.toDate().toLocaleString()}</span></div><div className="tournament-card-footer">{event.createdBy===user.uid?<button className="close-registration" onClick={()=>void closeTournament(event)}>Close registration</button>:<button className={joined[event.id]?'registered':'register-button'} onClick={()=>void (joined[event.id]?withdraw(event):register(event))}>{joined[event.id]?'Withdraw':'Join tournament'}</button>}<small>{event.createdBy===user.uid?'Organizer':'Hosted by CHECKMATE player'}</small></div></article>)}</div>}
      <div className="tournament-disclaimer">Tournament registration is available in this build. Capacity is currently informational; hard registration caps, pairings, standings, automated rounds, and result adjudication are part of the next competitive-system phase.</div>
    </section>
  </main>;
}
