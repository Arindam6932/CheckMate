import { Chess, type Square } from 'chess.js';

export type EngineMove = { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' };

const pieceValue: Record<string, number> = { p: 100, n: 315, b: 330, r: 500, q: 900, k: 20_000 };

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return -100_000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValue[piece.type] || 0;
      score += piece.color === game.turn() ? value : -value;
    }
  }
  if (game.isCheck()) score -= 24;
  return score;
}

function negamax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (game.isGameOver() || depth === 0) return evaluate(game);
  let best = -Infinity;
  const moves = game.moves({ verbose: true });
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
    const score = -negamax(next, depth - 1, -beta, -alpha);
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

export function findBestMove(game: Chess, depth = 2): EngineMove | null {
  if (game.isGameOver()) return null;
  let bestMove: EngineMove | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  for (const move of game.moves({ verbose: true })) {
    const next = new Chess(game.fen());
    next.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
    const score = -negamax(next, Math.max(0, depth - 1), -beta, -alpha);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
    }
    alpha = Math.max(alpha, score);
  }
  return bestMove;
}
