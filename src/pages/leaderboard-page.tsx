import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react';
import { db } from '../lib/firebase';

type Leader = { uid: string; displayName: string; photoURL?: string; ratings?: { rapid?: number; blitz?: number; classical?: number }; stats?: { gamesPlayed?: number; wins?: number } };

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<'rapid'|'blitz'|'classical'>('rapid');

  useEffect(() => {
    if (!db) { setBusy(false); return; }
    setBusy(true); setError('');
    const leadersQuery = query(collection(db, 'publicProfiles'), orderBy(`ratings.${category}`, 'desc'), limit(50));
    return onSnapshot(leadersQuery, snapshot => {
      setLeaders(snapshot.docs.map(item => ({ ...item.data(), uid: item.id } as Leader)));
      setBusy(false);
    }, err => { setError(err.message); setBusy(false); });
  }, [category]);

  return <main className="leaderboard-screen">
    <header className="leaderboard-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">THE COMPETITIVE LADDER</span></header>
    <section className="leaderboard-content">
      <div className="leaderboard-hero"><div className="leaderboard-icon"><Trophy size={23}/></div><div><span className="online-eyebrow">PROVE YOUR PROGRESS</span><h1>Leaderboards</h1><p>Player ratings update after completed rated online games.</p></div></div>
      <div className="leaderboard-tabs">{(['rapid','blitz','classical'] as const).map(value=><button key={value} className={category===value?'active':''} onClick={()=>setCategory(value)}>{value}</button>)}</div>
      {error && <div className="leaderboard-error">{error}</div>}
      {busy ? <div className="leaderboard-empty">Loading ratings…</div> : leaders.length===0 ? <div className="leaderboard-empty"><Trophy size={32}/><b>No rated games yet.</b><span>Complete an online match to appear on the ladder.</span></div> : <div className="leaderboard-table"><div className="leaderboard-table-head"><span>RANK</span><span>PLAYER</span><span>RATING</span><span>GAMES</span></div>{leaders.map((player,index)=><div className="leaderboard-row" key={player.uid}><span className="leader-rank">{index===0?<Crown size={16}/>:index<3?<Medal size={15}/>:String(index+1).padStart(2,'0')}</span><div className="leader-player"><div>{player.displayName?.charAt(0).toUpperCase()||'P'}</div><span><b>{player.displayName||'CHECKMATE player'}</b><small>{player.uid.slice(0,8)}…</small></span></div><strong>{player.ratings?.[category] ?? 1500}</strong><span className="leader-games">{player.stats?.gamesPlayed ?? 0}</span></div>)}</div>}
      <p className="leaderboard-note">Ratings use a provisional Elo system (K=32) in this build. Anti-cheat review, rating deviation, and seasonal resets are not yet implemented.</p>
    </section>
  </main>;
}
