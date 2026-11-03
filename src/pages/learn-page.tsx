import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess, type Square } from 'chess.js';
import { ArrowLeft, ArrowLeftRight, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react';
import { openings, fundamentals } from '../data/openings';
import { usePreferences } from '../context/preferences-context';

const glyph: Record<string,string> = { wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟' };

export default function LearnPage() {
  const { boardTheme, pieceSet } = usePreferences();
  const [tab, setTab] = useState<'openings'|'fundamentals'>('openings');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(0);
  const [ply, setPly] = useState(0);
  const [expandedLesson, setExpandedLesson] = useState(0);
  const opening = openings[selected];
  const filtered = openings.map((item,index)=>({item,index})).filter(({item})=>item.name.toLowerCase().includes(search.toLowerCase()) || item.eco.toLowerCase().includes(search.toLowerCase()));
  const game = useMemo(()=>{
    const replay = new Chess();
    opening.moves.slice(0,ply).forEach(move=>replay.move(move));
    return replay;
  },[opening,ply]);
  const rows = game.board();
  const files = 'abcdefgh'.split('');
  const ranks = [8,7,6,5,4,3,2,1];

  function chooseOpening(index:number) { setSelected(index); setPly(0); }
  function stepForward() { setPly(value=>Math.min(opening.moves.length,value+1)); }
  function stepBack() { setPly(value=>Math.max(0,value-1)); }

  return <main className="learn-screen">
    <header className="learn-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">LEARNING ACADEMY</span></header>
    <section className="learn-content">
      <div className="learn-hero"><div className="learn-hero-icon"><BookOpen size={22}/></div><div><span className="online-eyebrow">BUILD YOUR CHESS UNDERSTANDING</span><h1>Learn the ideas behind the moves.</h1><p>Explore opening structures, replay model lines, and sharpen your fundamentals.</p></div></div>
      <div className="learn-tabs"><button className={tab==='openings'?'active':''} onClick={()=>setTab('openings')}>Opening explorer</button><button className={tab==='fundamentals'?'active':''} onClick={()=>setTab('fundamentals')}>Chess fundamentals</button></div>
      {tab==='openings' ? <div className="opening-layout">
        <aside className="opening-list"><div className="opening-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search openings or ECO code"/></div><div className="opening-items">{filtered.map(({item,index})=><button key={item.name} className={selected===index?'opening-item active':'opening-item'} onClick={()=>chooseOpening(index)}><span><b>{item.name}</b><small>{item.side} · {item.eco}</small></span><ChevronRight size={15}/></button>)}</div></aside>
        <section className="opening-detail"><div className="opening-detail-head"><div><span className="online-eyebrow">OPENING STUDY · {opening.eco}</span><h2>{opening.name}</h2><p>{opening.summary}</p></div><span className="opening-side">{opening.side}</span></div>
          <div className="opening-board-area"><div className="opening-board-frame"><div className="opening-coords">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div><div className={`chessboard board-${boardTheme} piece-set-${pieceSet} opening-board`}>{rows.map((row,r)=>row.map((piece,col)=>{const square=(files[col]+ranks[r]) as Square;const light=(r+col)%2===0;return <div key={square} className={`square ${light?'light-square':'dark-square'}`}>{piece&&<span className={piece.color==='w'?'piece white-piece':'piece black-piece'}>{glyph[piece.color+piece.type]}</span>}</div>}))}</div><div className="opening-coords">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div></div><div className="opening-replay-controls"><button onClick={()=>setPly(0)} disabled={ply===0}>Start</button><button onClick={stepBack} disabled={ply===0}><ChevronLeft size={15}/> Back</button><span>{ply} / {opening.moves.length} plies</span><button onClick={stepForward} disabled={ply===opening.moves.length}>Next <ChevronRight size={15}/></button></div></div>
          <div className="opening-moves">{Array.from({length:Math.ceil(opening.moves.length/2)},(_,i)=><div className="opening-move-row" key={i}><span>{i+1}.</span><button className={ply===i*2+1?'current':''} onClick={()=>setPly(i*2+1)}>{opening.moves[i*2]}</button><button className={ply===i*2+2?'current':''} onClick={()=>setPly(Math.min(i*2+2,opening.moves.length))}>{opening.moves[i*2+1]||'…'}</button></div>)}</div>
          <div className="opening-ideas"><span className="online-eyebrow">KEY IDEAS</span>{opening.ideas.map(idea=><div key={idea}><Sparkles size={13}/><span>{idea}</span></div>)}</div>
        </section>
      </div> : <div className="fundamentals-layout">{fundamentals.map((lesson,index)=><article className="fundamental-card" key={lesson.title}><button onClick={()=>setExpandedLesson(expandedLesson===index?-1:index)}><span className="fundamental-number">{String(index+1).padStart(2,'0')}</span><span><small>{lesson.level}</small><b>{lesson.title}</b></span><ChevronDown className={expandedLesson===index?'expanded':''} size={17}/></button>{expandedLesson===index&&<p>{lesson.body}</p>}</article>)}</div>}
      <div className="learn-footer"><span>Ready to test your tactics?</span><Link to="/puzzles">Open the puzzle trainer <ArrowLeftRight size={14}/></Link></div>
    </section>
  </main>;
}
