import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chess, type Square } from 'chess.js';
import { ArrowLeft, CheckCircle2, Lightbulb, Puzzle, RotateCcw } from 'lucide-react';
import { puzzles } from '../data/puzzles';
import { usePreferences } from '../context/preferences-context';

const glyph: Record<string,string> = { wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟' };

export default function PuzzlesPage() {
  const { boardTheme, pieceSet } = usePreferences();
  const [index, setIndex] = useState(0);
  const [game, setGame] = useState(() => new Chess(puzzles[0].fen));
  const [selected, setSelected] = useState<Square | null>(null);
  const [legal, setLegal] = useState<Square[]>([]);
  const [solved, setSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState('Find the best move for White.');
  const [solvedCount, setSolvedCount] = useState(() => {
    try { return Number(window.localStorage.getItem('checkmate.puzzlesSolved') || 0); }
    catch { return 0; }
  });
  const puzzle = puzzles[index];

  useEffect(() => {
    setGame(new Chess(puzzle.fen));
    setSelected(null); setLegal([]); setSolved(false); setShowHint(false);
    setFeedback('Find the best move for White.');
  }, [index, puzzle.fen]);

  function chooseSquare(square: Square) {
    if (solved) return;
    const piece = game.get(square);
    if (selected && legal.includes(square)) {
      if (selected === puzzle.from && square === puzzle.to) {
        const next = new Chess(game.fen());
        next.move({ from: selected, to: square });
        setGame(next); setSolved(true); setSelected(null); setLegal([]);
        setFeedback(puzzle.explanation);
        setSolvedCount(value => {
          const nextValue = value + 1;
          try { window.localStorage.setItem('checkmate.puzzlesSolved', String(nextValue)); } catch { /* Session-only score. */ }
          return nextValue;
        });
      } else {
        setFeedback('That move is legal, but it does not solve this puzzle. Look for the forcing move.');
        setSelected(null); setLegal([]);
      }
      return;
    }
    if (piece && piece.color === game.turn()) {
      setSelected(square);
      setLegal(game.moves({ square, verbose: true }).map(move => move.to));
      setFeedback('Now choose the destination square.');
    } else {
      setSelected(null); setLegal([]);
    }
  }

  function nextPuzzle() { setIndex(value => (value + 1) % puzzles.length); }
  function resetPuzzle() {
    setGame(new Chess(puzzle.fen)); setSelected(null); setLegal([]);
    setSolved(false); setShowHint(false); setFeedback('Find the best move for White.');
  }

  const rows = game.board();
  const files = 'abcdefgh'.split('');
  const ranks = [8,7,6,5,4,3,2,1];

  return <main className="puzzles-screen">
    <header className="puzzles-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">TACTICS TRAINER</span></header>
    <section className="puzzles-layout">
      <div className="puzzles-intro"><div className="puzzles-icon"><Puzzle size={22}/></div><div><span className="online-eyebrow">TRAIN YOUR INSTINCTS</span><h1>One move can change everything.</h1><p>Short tactical challenges to build pattern recognition and calculation.</p></div></div>
      <div className="puzzle-grid">
        <section className="puzzle-board-card">
          <div className="puzzle-meta"><span>PUZZLE {String(index+1).padStart(2,'0')} / {String(puzzles.length).padStart(2,'0')}</span><span className={puzzle.difficulty==='Beginner'?'difficulty beginner':'difficulty'}>{puzzle.difficulty}</span></div>
          <div className="puzzle-board-frame"><div className="puzzle-coordinates">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div><div className={`chessboard board-${boardTheme} piece-set-${pieceSet} puzzle-board`}>
            {rows.map((row,r)=>row.map((piece,col)=>{
              const square=(files[col]+ranks[r]) as Square;
              const isLight=(r+col)%2===0;
              return <button key={square} onClick={()=>chooseSquare(square)} className={`square ${isLight?'light-square':'dark-square'} ${selected===square?'selected':''}`}>
                {piece && <span className={piece.color==='w'?'piece white-piece':'piece black-piece'}>{glyph[piece.color+piece.type]}</span>}
                {legal.includes(square) && <span className={piece?'legal-capture':'legal-dot'}/>}
                {col===0 && <small className="rank-label">{ranks[r]}</small>}
                {r===7 && <small className="file-label">{files[col]}</small>}
              </button>;
            }))}
          </div><div className="puzzle-coordinates">{ranks.map(rank=><span key={rank}>{rank}</span>)}</div></div>
          <div className={solved?'puzzle-feedback solved':'puzzle-feedback'}>{solved?<CheckCircle2 size={17}/>:<Puzzle size={16}/>}<span>{feedback}</span></div>
          <div className="puzzle-controls"><button onClick={()=>setShowHint(value=>!value)}><Lightbulb size={15}/>{showHint?'Hide hint':'Hint'}</button><button onClick={resetPuzzle}><RotateCcw size={15}/>Reset</button>{solved&&<button className="next-puzzle" onClick={nextPuzzle}>Next puzzle →</button>}</div>
          {showHint && <div className="puzzle-hint">{puzzle.hint}</div>}
        </section>
        <aside className="puzzle-info-card"><span className="online-eyebrow">THE CHALLENGE</span><h2>{puzzle.title}</h2><p>{puzzle.theme}</p><div className="puzzle-info-divider"/><div className="puzzle-stat"><span>PUZZLES SOLVED</span><b>{solvedCount}</b></div><div className="puzzle-stat"><span>THIS SESSION</span><b>{solved ? '1' : '0'}</b></div><div className="puzzle-tip"><b>Training tip</b><span>Before moving, look for checks, captures, and direct threats. Calculate your opponent’s best reply.</span></div><button className="puzzle-next-wide" onClick={nextPuzzle}>Skip puzzle <ArrowLeft size={14}/></button></aside>
      </div>
    </section>
  </main>;
}
