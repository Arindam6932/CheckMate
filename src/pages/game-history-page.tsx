import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, where, type Timestamp } from 'firebase/firestore';
import { ArrowLeft, Check, Copy, History, Swords } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { db } from '../lib/firebase';

type GameRecord = {
  gameId: string;
  whiteUid: string;
  blackUid: string;
  timeControl: string;
  result: string;
  reason: string;
  pgn: string;
  moveCount: number;
  finishedAt?: Timestamp;
};

export default function GameHistoryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GameRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?mode=login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !db) { setBusy(false); return; }
    let active = true;
    async function loadHistory() {
      setBusy(true); setError('');
      try {
        const gamesRef = collection(db!, 'games');
        const [white, black] = await Promise.all([
          getDocs(query(gamesRef, where('whiteUid', '==', user!.uid), limit(30))),
          getDocs(query(gamesRef, where('blackUid', '==', user!.uid), limit(30))),
        ]);
        const records = [...white.docs, ...black.docs].map(item => ({ ...item.data(), gameId: item.id } as GameRecord));
        const unique = Array.from(new Map(records.map(item => [item.gameId, item])).values());
        unique.sort((a,b) => (b.finishedAt?.toMillis() || 0) - (a.finishedAt?.toMillis() || 0));
        if (active) setGames(unique);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load game history.');
      } finally { if (active) setBusy(false); }
    }
    void loadHistory();
    return () => { active = false; };
  }, [user]);

  if (loading || !user) return <main className="history-loading">Loading your game history…</main>;

  function resultLabel(record: GameRecord) {
    if (record.result === 'draw') return 'DRAW';
    const won = (record.result === 'white-wins' && record.whiteUid === user.uid) || (record.result === 'black-wins' && record.blackUid === user.uid);
    return won ? 'WIN' : 'LOSS';
  }

  return <main className="history-screen">
    <header className="history-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="history-user">{user.displayName || user.email}</span></header>
    <section className="history-content">
      <div className="history-title"><div className="history-icon"><History size={21}/></div><div><span className="online-eyebrow">YOUR CHESS JOURNEY</span><h1>Game history</h1><p>Your completed online matches, saved to your account.</p></div></div>
      {error && <div className="history-error">{error}</div>}
      {busy ? <div className="history-empty">Loading completed games…</div> : games.length === 0 ? <div className="history-empty"><Swords size={34}/><b>No completed online games yet.</b><span>Your multiplayer games will appear here after they finish.</span><Link to="/play-online">Find your first opponent <span>→</span></Link></div> : <div className="history-list">
        {games.map(record => {
          const myColor = record.whiteUid === user.uid ? 'White' : 'Black';
          const opponent = record.whiteUid === user.uid ? record.blackUid : record.whiteUid;
          const result = resultLabel(record);
          return <button className="history-item" key={record.gameId} onClick={()=>{setSelected(record);setCopied(false);}}>
            <span className={`history-result ${result.toLowerCase()}`}>{result}</span>
            <div className="history-match"><b>{myColor} vs {opponent.slice(0,8)}…</b><span>{record.timeControl} · {record.moveCount} plies · {record.reason.replaceAll('-', ' ')}</span></div>
            <time>{record.finishedAt?.toDate().toLocaleDateString() || 'Recently'}</time>
            <span className="history-open">View PGN →</span>
          </button>;
        })}
      </div>}
    </section>
    {selected && <div className="pgn-backdrop" onClick={()=>setSelected(null)}><section className="pgn-modal" onClick={event=>event.stopPropagation()}><div className="pgn-title"><div><span className="online-eyebrow">GAME RECORD</span><h2>Portable Game Notation</h2></div><button onClick={()=>setSelected(null)}>×</button></div><pre>{selected.pgn || 'No move notation available.'}</pre><button className="pgn-copy" onClick={()=>{void navigator.clipboard?.writeText(selected.pgn);setCopied(true);}}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy PGN'}</button></section></div>}
  </main>;
}
