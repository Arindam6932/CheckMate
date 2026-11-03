export type ChessPuzzle = {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate';
  theme: string;
  fen: string;
  from: string;
  to: string;
  san: string;
  hint: string;
  explanation: string;
};

export const puzzles: ChessPuzzle[] = [
  {
    id: 'mate-001',
    title: 'The protected queen',
    difficulty: 'Beginner',
    theme: 'Checkmate in one',
    fen: 'k7/3Q4/2K5/8/8/8/8/8 w - - 0 1',
    from: 'd7',
    to: 'b7',
    san: 'Qb7#',
    hint: 'Move the queen to a square next to the king, protected by your own king.',
    explanation: 'The queen checks along the diagonal. Your king protects the queen, while the queen controls the escape squares.',
  },
  {
    id: 'mate-002',
    title: 'A royal net',
    difficulty: 'Beginner',
    theme: 'Checkmate in one',
    fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1',
    from: 'g6',
    to: 'g7',
    san: 'Qg7#',
    hint: 'The queen can step forward one square. Make sure your king protects it.',
    explanation: 'The queen gives diagonal check and covers the king’s flight squares. The white king protects the checking queen.',
  },
  {
    id: 'mate-003',
    title: 'Cornered king',
    difficulty: 'Beginner',
    theme: 'Checkmate in one',
    fen: '8/8/8/8/8/2K5/3Q4/k7 w - - 0 1',
    from: 'd2',
    to: 'b2',
    san: 'Qb2#',
    hint: 'Look for a queen move that checks diagonally and is protected by your king.',
    explanation: 'The queen checks the corner king and controls both adjacent escape squares. Your king guards the queen.',
  },
  {
    id: 'mate-004',
    title: 'The final diagonal',
    difficulty: 'Intermediate',
    theme: 'Checkmate in one',
    fen: '8/8/8/8/6Q1/5K2/8/7k w - - 0 1',
    from: 'g4',
    to: 'g2',
    san: 'Qg2#',
    hint: 'Bring the queen closer to the opposing king while keeping it defended.',
    explanation: 'The queen checks on the diagonal and covers the king’s only flight squares. The white king protects the queen on g2.',
  },
];
