import { Chess, type Square } from 'chess.js';

export type EngineMove = { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' };

const pieceValue: Record<string, number> = { p: 100, n: 315, b: 330, r: 500, q: 900, k: 20_000 };

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return -100_000;
  if (game.isDraw()) return 0;
  let score = 0;
  const board = game.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;
      const value = pieceValue[piece.type] || 0;
      const advance = piece.color === 'w' ? 6 - rank : rank - 1;
      const centerDistance = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
      const positional = piece.type === 'p' ? advance * 7 : piece.type === 'n' || piece.type === 'b' ? (7 - centerDistance) * 5 : 0;
      const signed = value + positional;
      score += piece.color === game.turn() ? signed : -signed;
    }
  }
  if (game.isCheck()) score -= 28;
  return score;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isGameOver() || depth === 0) return evaluate(game);
  let best = -Infinity;
  for (const move of game.moves({ verbose: true })) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion as 'q' | 'r' | 'b' | 'n' } : {}) });
    const score = -negamax(next, depth - 1, -beta, -alpha);
    best = Math.max(best, score);
    if (alpha >= beta) break;
  }
  return best;
}

/** Skill 1 plays varied plausible moves; skill 10 consistently selects the strongest searched move. */
export function findBestMove(game: Chess, depth = 2, skillLevel = 10): EngineMove | null {
  if (game.isGameOver()) return null;
  const skill = Math.max(1, Math.min(10, Math.round(skillLevel)));
  const scored: Array<{ move: EngineMove; score: number }> = [];
  for (const move of game.moves({ verbose: true })) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion as 'q' | 'r' | 'b' | 'n' } : {}) });
    const score = -negamax(next, Math.max(0, depth - 1), -Infinity, Infinity);
    scored.push({
      move: { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion as 'q' | 'r' | 'b' | 'n' } : {}) },
      score,
    });
    alpha = Math.max(alpha, score);
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const poolSize = Math.max(1, Math.ceil(scored.length * (0.82 - skill * 0.078)));
  const pool = scored.slice(0, poolSize);
  const weights = pool.map((_, index) => Math.pow(pool.length - index, skill / 3));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let ticket = Math.random() * total;
  for (let index = 0; index < pool.length; index++) {
    ticket -= weights[index];
    if (ticket <= 0) return pool[index].move;
  }
  return pool[0].move;
}
