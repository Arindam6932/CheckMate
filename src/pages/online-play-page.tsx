import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chess, type Square } from 'chess.js';
import type { Socket } from 'socket.io-client';
import { ArrowLeft, Copy, LogOut, Radio, Swords, Users } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { connectMultiplayer } from '../lib/multiplayer';

type MatchInfo = { gameId: string; color: 'w' | 'b'; opponentUid: string; timeControl: string; whiteTimeMs: number; blackTimeMs: number };
const formatOnlineClock = (milliseconds: number) => {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};
const glyph: Record<string, string> = { wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟' };

export default function OnlinePlayPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Connect to find an opponent.');
  const [timeControl, setTimeControl] = useState('10+0');
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const [legal, setLegal] = useState<Square[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [clocks, setClocks] = useState({ white: 600_000, black: 600_000 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?mode=login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    connectMultiplayer().then(socket => {
      if (!active) { socket.disconnect(); return; }
      socketRef.current = socket;
      socket.on('connect', () => { setConnected(true); setStatus('Connected. Ready to play online.'); });
      socket.on('disconnect', () => { setConnected(false); setPaused(true); setStatus('Connection lost. Reconnecting…'); });
      socket.on('connect_error', error => { setConnected(false); setStatus(error.message); });
      socket.on('queue:waiting', () => setStatus('Searching for an opponent…'));
      socket.on('queue:left', () => setStatus('Matchmaking cancelled.'));
      socket.on('match:found', (data: MatchInfo & { fen: string }) => {
        setMatch(data); setBusy(false); setPaused(false); setClocks({ white: data.whiteTimeMs, black: data.blackTimeMs }); setGame(new Chess(data.fen)); setSelected(null); setLegal([]);
        setStatus(data.color === 'w' ? 'You are playing White.' : 'You are playing Black.');
      });
      socket.on('game:state', (data: { fen: string; pgn: string; check: boolean; checkmate: boolean; draw: boolean; gameOver: boolean; whiteTimeMs: number; blackTimeMs: number; paused?: boolean }) => {
        const next = new Chess();
        if (data.pgn) next.loadPgn(data.pgn); else next.load(data.fen);
        setGame(next); setSelected(null); setLegal([]); setPaused(Boolean(data.paused)); setClocks({ white: data.whiteTimeMs, black: data.blackTimeMs });
        setStatus(data.checkmate ? 'Checkmate — game finished.' : data.draw ? 'Draw — game finished.' : data.check ? 'Check.' : 'Game in progress.');
      });
      socket.on('game:ended', (data: { result: string; reason: string; whiteTimeMs?: number; blackTimeMs?: number }) => { setPaused(true); if (data.whiteTimeMs !== undefined && data.blackTimeMs !== undefined) setClocks({ white: data.whiteTimeMs, black: data.blackTimeMs }); setStatus(data.result === 'draw' ? 'Draw agreed.' : `Game ended: ${data.reason}.`); });
      socket.on('game:draw-offered', () => setStatus('Your opponent offered a draw.'));
      socket.on('game:draw-declined', () => setStatus('Draw offer declined.'));
      socket.on('game:opponent-disconnected', () => { setPaused(true); setStatus('Your opponent disconnected. Clocks paused for 60 seconds.'); });
      socket.on('game:opponent-reconnected', () => { setPaused(false); setStatus('Your opponent reconnected. Game resumed.'); });
      socket.on('game:error', (data: { message: string }) => setStatus(data.message));
      socket.on('private:created', (data: { code: string }) => { setInviteCode(data.code); setStatus('Private invitation created. Share the code with your opponent.'); });
    }).catch(error => { if (active) setStatus(error instanceof Error ? error.message : 'Could not connect to the game server.'); });
    return () => { active = false; socketRef.current?.disconnect(); socketRef.current = null; };
  }, [user]);

  useEffect(() => {
    if (connected && match) socketRef.current?.emit('game:reconnect', { gameId: match.gameId });
  }, [connected, match]);

  useEffect(() => {
    if (!match || paused || game.isGameOver()) return;
    const timer = window.setInterval(() => {
      if (game.turn() === 'w') setClocks(value => ({ ...value, white: Math.max(0, value.white - 1000) }));
      else setClocks(value => ({ ...value, black: Math.max(0, value.black - 1000) }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [match, game, paused]);

  function joinQueue() {
    if (!socketRef.current || !connected) { setStatus('Waiting for a secure server connection.'); return; }
    setMatch(null); setGame(new Chess()); setBusy(true);
    socketRef.current.emit('queue:join', { timeControl });
  }
  function cancelQueue() {
    socketRef.current?.emit('queue:leave'); setBusy(false);
  }
  function createPrivate() {
    socketRef.current?.emit('private:create', { timeControl });
  }
  function joinPrivate() {
    if (!joinCode.trim()) { setStatus('Enter your invitation code.'); return; }
    socketRef.current?.emit('private:join', { code: joinCode.trim() });
  }
  function moveTo(square: Square) {
    if (!match || game.isGameOver() || game.turn() !== match.color) return;
    const piece = game.get(square);
    if (selected && legal.includes(square)) {
      const promotion = game.moves({ verbose: true }).find(move => move.from === selected && move.to === square && move.promotion);
      socketRef.current?.emit('game:move', { gameId: match.gameId, from: selected, to: square, ...(promotion ? { promotion: 'q' } : {}) });
      setSelected(null); setLegal([]); return;
    }
    if (piece && piece.color === match.color) {
      setSelected(square); setLegal(game.moves({ square, verbose: true }).map(move => move.to));
    } else { setSelected(null); setLegal([]); }
  }

  const rows = game.board();
  const displayRows = match?.color === 'b' ? [...rows].reverse().map(row => [...row].reverse()) : rows;
  const files = match?.color === 'b' ? 'hgfedcba'.split('') : 'abcdefgh'.split('');
  const ranks = match?.color === 'b' ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  if (loading || !user) return <main className="online-loading">Loading online play…</main>;

  return <main className="online-screen">
    <header className="online-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-status"><i className={connected ? 'connected' : ''}/>{connected ? 'SERVER CONNECTED' : 'CONNECTING'}</span></header>
    <div className="online-layout">
      <section className="online-board-panel">
        <div className="online-player-row"><div className="online-player-avatar">♟</div><div><b>{match ? 'Opponent' : 'Online arena'}</b><small>{match ? 'CHECKMATE player' : 'Real-time matchmaking'}</small></div>{match && <div className="online-clock-pair"><span className={game.turn()==='w'?'online-clock-active':''}>♙ {formatOnlineClock(clocks.white)}</span><span className={game.turn()==='b'?'online-clock-active':''}>♟ {formatOnlineClock(clocks.black)}</span></div>}<span className="online-control">{match?.timeControl || timeControl}</span></div>
        {match ? <div className="online-board-wrap"><div className="online-coords">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div><div className="online-board">
          {displayRows.map((row,r)=>row.map((piece,col)=>{
            const square=(files[col]+ranks[r]) as Square;
            const light=(r+col)%2===0;
            const selectedSquare=selected===square;
            const isLegal=legal.includes(square);
            return <button key={square} onClick={()=>moveTo(square)} className={`online-square ${light?'online-light':'online-dark'} ${selectedSquare?'online-selected':''}`}>
              {piece && <span className={piece.color==='w'?'online-white-piece':'online-black-piece'}>{glyph[piece.color+piece.type]}</span>}
              {isLegal && <i className={piece?'online-capture':'online-dot'}/>}
              {col===0 && <small>{ranks[r]}</small>}
              {r===7 && <em>{files[col]}</em>}
            </button>;
          }))}
        </div><div className="online-coords">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div></div> : <div className="online-empty-board"><span>♞</span><b>Your next opponent is out there.</b><p>Find a rated or casual match, or invite a friend with a private code.</p></div>}
        <div className="online-game-status"><Radio size={15}/>{status}</div>
        {match && <div className="online-game-actions"><button onClick={()=>socketRef.current?.emit('game:offer-draw',{gameId:match.gameId})}>Offer draw</button><button className="resign" onClick={()=>socketRef.current?.emit('game:resign',{gameId:match.gameId})}>Resign</button></div>}
      </section>
      <aside className="online-side-panel">
        <div className="online-eyebrow">PLAY SOMEONE REAL</div><h1>Find your match.</h1><p>Fair, fast, and focused on the game.</p>
        <label className="online-field-label">TIME CONTROL<select value={timeControl} onChange={e=>setTimeControl(e.target.value)} disabled={busy || Boolean(match)}><option value="3+0">3 min · Blitz</option><option value="5+0">5 min · Blitz</option><option value="10+0">10 min · Rapid</option><option value="15+10">15 + 10 · Rapid</option><option value="30+0">30 min · Classical</option></select></label>
        {!match ? <><button className="online-primary" onClick={joinQueue} disabled={!connected || busy}><Swords size={17}/>{busy?'Searching…':'Find an opponent'}</button>{busy && <button className="online-secondary" onClick={cancelQueue}>Cancel search</button>}
          <div className="online-separator"><span/> OR PLAY A FRIEND <span/></div>
          <button className="online-secondary" onClick={createPrivate} disabled={!connected}><Users size={16}/> Create private game</button>
          {inviteCode && <div className="invite-code"><span>INVITATION CODE</span><b>{inviteCode}</b><button onClick={()=>void navigator.clipboard?.writeText(inviteCode)} aria-label="Copy invitation code"><Copy size={15}/></button></div>}
          <div className="join-private"><input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="Enter friend's code" maxLength={8}/><button onClick={joinPrivate} disabled={!connected}>Join</button></div>
        </> : <><div className="online-match-found"><span>♟</span><div><b>Match found</b><small>Game ID {match.gameId.slice(0,8)}</small></div></div><button className="online-secondary" onClick={()=>{if(!paused && !game.isGameOver()) socketRef.current?.emit('game:resign',{gameId:match.gameId});setMatch(null);setBusy(false);setStatus('You left the game.')}}><LogOut size={15}/> Resign & leave</button></>}
        <div className="online-security"><ShieldCheckIcon/> Only authenticated players can join active game rooms. Spectator access is not enabled in this build.</div>
      </aside>
    </div>
  </main>;
}

function ShieldCheckIcon(){return <span className="online-shield">✓</span>}
