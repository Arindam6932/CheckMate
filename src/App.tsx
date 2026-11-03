import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { Chess, type Square } from 'chess.js';
import {
  Activity, ArrowDownUp, ArrowLeft, ArrowRight, Bell, BookOpen, ChevronDown,
  ChevronRight, CircleHelp, Crown, Flame, GraduationCap, History,
  MessageCircle, Moon, MoreHorizontal, Play, Puzzle, Search, Settings,
  ShieldCheck, Sparkles, Swords, Trophy, Users, Volume2, Zap
} from 'lucide-react';

type NavItem = { label: string; icon: typeof Play };
const navItems: NavItem[] = [
  { label: 'Play', icon: Swords }, { label: 'Puzzles', icon: Puzzle },
  { label: 'Learn', icon: GraduationCap }, { label: 'Watch', icon: Activity },
  { label: 'Community', icon: Users }, { label: 'Tournaments', icon: Trophy },
];

const glyph: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};
const initialGame = () => new Chess();

export default function App() {
  const navigate = useNavigate();
  const { user, logOut } = useAuth();
  const [game, setGame] = useState(initialGame);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legal, setLegal] = useState<Square[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [activeNav, setActiveNav] = useState('Play');
  const [showProfile, setShowProfile] = useState(false);
  const [showMoves, setShowMoves] = useState(true);
  const [notice, setNotice] = useState('Your board is ready. Make the first move.');
  const [darkMode, setDarkMode] = useState(true);

  const board = useMemo(() => {
    const rows = game.board();
    return flipped ? [...rows].reverse().map(row => [...row].reverse()) : rows;
  }, [game, flipped]);

  const playedMoves = game.history({ verbose: true });
  const lastMove = playedMoves[playedMoves.length - 1];
  const movePairs = useMemo(() => {
    const history = game.history();
    return Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => ({
      number: i + 1, white: history[i * 2], black: history[i * 2 + 1],
    }));
  }, [game]);

  function chooseSquare(square: Square) {
    const piece = game.get(square);
    if (selected && legal.includes(square)) {
      const next = new Chess(game.fen());
      try {
        next.move({ from: selected, to: square, promotion: 'q' });
        setGame(next);
        setNotice(next.isCheckmate() ? 'Checkmate. Game over.' : next.isCheck() ? 'Check.' : 'Move played.');
      } catch { setNotice('That move is not legal.'); }
      setSelected(null); setLegal([]);
      return;
    }
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      setLegal(game.moves({ square, verbose: true }).map(move => move.to));
    } else {
      setSelected(null); setLegal([]);
    }
  }

  function resetGame() {
    setGame(new Chess()); setSelected(null); setLegal([]);
    setNotice('New game started. White to move.');
  }
  function undoMove() {
    const next = new Chess(game.fen());
    next.undo();
    setGame(next); setSelected(null); setLegal([]);
    setNotice('Last move taken back.');
  }

  const status = game.isCheckmate() ? 'CHECKMATE' : game.isDraw() ? 'DRAW' : game.isCheck() ? 'CHECK' : game.turn() === 'w' ? 'WHITE TO MOVE' : 'BLACK TO MOVE';
  const files = flipped ? 'hgfedcba'.split('') : 'abcdefgh'.split('');
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  return (
    <div className={darkMode ? 'app-shell' : 'app-shell light'}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setActiveNav('Play')}>
          <span className="brand-mark">♞</span><span>CHECK<span className="brand-gold">MATE</span></span>
        </a>
        <nav className="main-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.label} className={activeNav === item.label ? 'nav-link active' : 'nav-link'} onClick={() => { setActiveNav(item.label); if (item.label !== 'Play') setNotice(item.label + ' is coming in a future build phase.'); }}>
              <Icon size={16} strokeWidth={1.8} />{item.label}
            </button>;
          })}
        </nav>
        <div className="top-actions">
          <button className="icon-button" aria-label="Search"><Search size={18}/></button>
          <button className="icon-button notification" aria-label="Notifications"><Bell size={18}/><i/></button>
          <button className="avatar-button" onClick={() => setShowProfile(!showProfile)} aria-label="Open profile menu">{user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "A"}<ChevronDown size={13}/></button>
          {showProfile && <div className="profile-menu">
            <div className="profile-heading"><div className="avatar large">{user?.displayName?.charAt(0).toUpperCase() || "A"}</div><div><strong>{user?.displayName || "Guest Player"}</strong><span>{user?.email || "Sign in to save progress"}</span></div></div>
            {['Your profile','Game history','Statistics & ratings','Settings','Help & support'].map((label, i) => <button key={label} onClick={() => { setNotice(label + ' will be available after account setup.'); setShowProfile(false); }}><span>{[<Users/>,<History/>,<Activity/>,<Settings/>,<CircleHelp/>][i]}</span>{label}</button>)}
            <button className="profile-signin" onClick={() => { setShowProfile(false); if (user) { void logOut().then(() => setNotice("Signed out successfully.")).catch(() => setNotice("Could not sign out. Please retry.")); } else { navigate("/auth?mode=login"); } }}>{user ? "Sign out" : "Sign in / Create account"} <ArrowRight size={14}/></button>
          </div>}
        </div>
      </header>

      <main className="page-wrap">
        <section className="welcome-row">
          <div><div className="eyebrow"><span className="live-dot"/> THE BOARD IS YOURS</div><h1>Make your next move <em>legendary.</em></h1><p>A place to play boldly, learn deeply, and find your people.</p></div>
          <div className="welcome-right"><div className="streak-chip"><Flame size={15}/> <b>0</b> day streak</div><button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle appearance">{darkMode ? <Moon size={17}/> : <Sparkles size={17}/>}</button></div>
        </section>

        <section className="main-grid">
          <div className="board-column">
            <div className="board-topline"><div className="opponent"><div className="opponent-avatar">♟</div><div><strong>Practice board</strong><span>Local game · No opponent connected</span></div></div><button className="subtle-icon" onClick={() => setNotice('Game options will be expanded in the next build phase.')}><MoreHorizontal size={20}/></button></div>
            <div className="board-frame">
              <div className="board-coordinates left">{ranks.map(n => <span key={n}>{n}</span>)}</div>
              <div className="chessboard classic">
                {board.map((row, r) => row.map((piece, c) => {
                  const square = (files[c] + ranks[r]) as Square;
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selected === square;
                  const isLegal = legal.includes(square);
                  const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
                  return <button key={square} aria-label={square} onClick={() => chooseSquare(square)} className={['square', isLight ? 'light-square' : 'dark-square', isSelected ? 'selected' : '', isLast ? 'last-move' : ''].join(' ')}>
                    {piece && <span className={'piece ' + (piece.color === 'w' ? 'white-piece' : 'black-piece')}>{glyph[piece.color + piece.type]}</span>}
                    {isLegal && <span className={piece ? 'legal-capture' : 'legal-dot'}/>}
                    {c === 0 && <small className="rank-label">{ranks[r]}</small>}
                    {r === 7 && <small className="file-label">{files[c]}</small>}
                  </button>;
                }))}
              </div>
              <div className="board-coordinates right">{ranks.map(n => <span key={n}>{n}</span>)}</div>
            </div>
            <div className="board-controls">
              <div className="turn-indicator"><span className={game.turn() === 'w' ? 'turn-piece white-turn' : 'turn-piece black-turn'}>{game.turn() === 'w' ? '♙' : '♟'}</span><div><b>{status}</b><small>{notice}</small></div></div>
              <div className="control-buttons"><button onClick={undoMove} disabled={!game.history().length} title="Undo"><ArrowLeft size={17}/></button><button onClick={() => setFlipped(!flipped)} title="Flip board"><ArrowDownUp size={17}/></button><button onClick={resetGame} title="Restart"><History size={17}/></button><button onClick={() => setNotice('Sound controls will be available with the settings system.')} title="Sound"><Volume2 size={17}/></button></div>
            </div>
          </div>

          <aside className="play-sidebar">
            <div className="sidebar-heading"><div><span className="eyebrow">YOUR NEXT GAME</span><h2>Choose how to play</h2></div><span className="heading-spark">✳</span></div>
            <div className="play-options">
              <button className="play-card featured" onClick={() => { resetGame(); setNotice('Practice board reset. Online matchmaking is coming soon.'); }}>
                <div className="play-icon gold"><Zap size={20}/></div><div className="play-copy"><strong>Quick play</strong><span>Find a game in seconds</span></div><span className="play-arrow"><ArrowRight size={17}/></span><span className="card-glow"/>
              </button>
              <button className="play-card" onClick={() => setNotice('Ranked matchmaking will arrive with the multiplayer phase.')}><div className="play-icon purple"><Trophy size={20}/></div><div className="play-copy"><strong>Ranked</strong><span>Climb the leaderboard</span></div><ChevronRight size={17}/></button>
              <button className="play-card" onClick={() => setNotice('Friend challenges will arrive with social accounts.')}><div className="play-icon blue"><Users size={20}/></div><div className="play-copy"><strong>Play a friend</strong><span>Challenge someone you know</span></div><ChevronRight size={17}/></button>
              <button className="play-card" onClick={() => setNotice('AI opponents will be added with the engine integration.')}><div className="play-icon green"><Sparkles size={20}/></div><div className="play-copy"><strong>Play computer</strong><span>Practice at your own pace</span></div><ChevronRight size={17}/></button>
            </div>
            <div className="time-control"><div><span className="eyebrow">TIME CONTROL</span><strong>10 min <small>Rapid</small></strong></div><button onClick={() => setNotice('Time control selection is coming soon.')}>Change <ChevronDown size={13}/></button></div>
            <div className="sidebar-divider"/>
            <div className="sidebar-heading compact"><div><span className="eyebrow">MAKE YOUR MOVE</span><h2>Explore more</h2></div><button className="text-link" onClick={() => setActiveNav('Learn')}>View all <ArrowRight size={13}/></button></div>
            <div className="explore-grid">
              <button onClick={() => {setActiveNav('Puzzles');setNotice('Daily puzzles are coming soon.')}}><span className="explore-icon coral"><Puzzle size={18}/></span><b>Puzzles</b><small>Sharpen tactics</small></button>
              <button onClick={() => {setActiveNav('Learn');setNotice('Learning academy is coming soon.')}}><span className="explore-icon teal"><BookOpen size={18}/></span><b>Learn</b><small>Build your game</small></button>
              <button onClick={() => {setActiveNav('Tournaments');setNotice('Tournaments are coming soon.')}}><span className="explore-icon amber"><Crown size={18}/></span><b>Events</b><small>Compete together</small></button>
              <button onClick={() => {setActiveNav('Community');setNotice('Clubs and community are coming soon.')}}><span className="explore-icon pink"><MessageCircle size={18}/></span><b>Community</b><small>Find your people</small></button>
            </div>
          </aside>
        </section>

        <section className="lower-grid">
          <div className="lower-card activity-card"><div className="section-title"><div><span className="eyebrow">THE JOURNEY</span><h3>Your chess snapshot</h3></div><span className="muted-tag">NEW PLAYER</span></div><div className="stats-row"><div><strong>—</strong><span>Rapid rating</span></div><div><strong>—</strong><span>Games played</span></div><div><strong>—</strong><span>Win rate</span></div><div><strong>0</strong><span>Day streak</span></div></div><div className="empty-progress"><div className="progress-icon"><Activity size={18}/></div><div><b>Your story starts with a single move.</b><span>Play your first game to begin tracking your progress.</span></div><ChevronRight size={17}/></div></div>
          <div className="lower-card moves-card"><div className="section-title"><div><span className="eyebrow">LIVE BOARD</span><h3>Move history</h3></div><button className="subtle-icon" onClick={() => setShowMoves(!showMoves)}>{showMoves ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</button></div>{showMoves && <div className="move-list">{movePairs.length ? movePairs.map(pair => <div className="move-row" key={pair.number}><span>{pair.number}.</span><b>{pair.white}</b><b>{pair.black || '…'}</b></div>) : <div className="no-moves"><span>♘</span><p>Your moves will appear here.</p><small>Make a move to get started.</small></div>}</div>}</div>
        </section>

        <footer className="footer"><div className="footer-brand"><span className="brand-mark">♞</span> CHECK<span className="brand-gold">MATE</span></div><span>Thoughtfully made for the love of the game.</span><div><button onClick={() => setNotice('Fair play and safety standards will be published before multiplayer launch.')}><ShieldCheck size={14}/> Fair play</button><button onClick={() => setNotice('Settings are coming soon.')}><Settings size={14}/> Settings</button></div></footer>
      </main>
      {notice && <div className="sr-only" aria-live="polite">{notice}</div>}
    </div>
  );
}