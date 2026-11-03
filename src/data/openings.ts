export type OpeningLine = {
  name: string;
  eco: string;
  side: 'White' | 'Black';
  moves: string[];
  summary: string;
  ideas: string[];
};

export const openings: OpeningLine[] = [
  { name:'Italian Game', eco:'C50', side:'White', moves:['e4','e5','Nf3','Nc6','Bc4','Bc5'], summary:'A classical open game that develops quickly and points both sides toward the center and the f7/f2 squares.', ideas:['Develop the bishop to an active diagonal.','Castle early and keep the center flexible.','Look for d3 or c3 followed by d4.'] },
  { name:'Ruy Lopez', eco:'C60', side:'White', moves:['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6'], summary:'A strategic opening that pressures the c6-knight and builds long-term central control.', ideas:['Maintain pressure on the c6-knight.','Prepare c3 and d4 when the center is ready.','Understand when to exchange the bishop for the knight.'] },
  { name:'Sicilian Defense', eco:'B20', side:'Black', moves:['e4','c5','Nf3','d6','d4','cxd4','Nxd4'], summary:'An ambitious response to 1.e4 that fights for the center asymmetrically and creates dynamic positions.', ideas:['Challenge White’s central e-pawn.','Develop actively and watch the d5 square.','Expect opposite-side plans in many sharp variations.'] },
  { name:'French Defense', eco:'C00', side:'Black', moves:['e4','e6','d4','d5','Nc3','Nf6'], summary:'A resilient structure where Black challenges the center and often counterattacks with …c5.', ideas:['Prepare …c5 to challenge d4.','Manage the light-squared bishop carefully.','Use the pawn chain to guide your plans.'] },
  { name:'Caro-Kann Defense', eco:'B10', side:'Black', moves:['e4','c6','d4','d5','Nc3','dxe4','Nxe4'], summary:'A solid reply to 1.e4 that supports …d5 and often gives Black a sound pawn structure.', ideas:['Develop the light-squared bishop before …e6 in many lines.','Challenge the center without rushing.','Use the solid structure for a patient middlegame.'] },
  { name:'Queen’s Gambit', eco:'D06', side:'White', moves:['d4','d5','c4','e6','Nc3','Nf6'], summary:'White offers a wing pawn to gain central influence and rapid development.', ideas:['The c4-pawn is a gambit offer, not usually a free pawn.','Build pressure on d5.','Develop naturally before launching a central break.'] },
  { name:'King’s Indian Defense', eco:'E60', side:'Black', moves:['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6'], summary:'A hypermodern defense that allows White a broad center before challenging it with …e5 or …c5.', ideas:['Fianchetto the dark-squared bishop.','Choose the right central break.','Counterattack on the kingside when the center locks.'] },
  { name:'London System', eco:'D02', side:'White', moves:['d4','d5','Bf4','Nf6','e3','e6','Nf3'], summary:'A practical system built around a stable pawn structure and easy piece development.', ideas:['Develop the light-squared bishop before e3.','Support e3 and develop the knights.','Choose c3, Bd3, and a kingside plan based on Black’s setup.'] },
  { name:'English Opening', eco:'A10', side:'White', moves:['c4','e5','Nc3','Nf6','g3','d5','cxd5','Nxd5'], summary:'A flexible flank opening that influences the center from the side and often transposes into other structures.', ideas:['Control d5 and e4 from the flanks.','Fianchetto the king’s bishop.','Use the c-file and central breaks at the right moment.'] },
  { name:'Nimzo-Indian Defense', eco:'E20', side:'Black', moves:['d4','Nf6','c4','e6','Nc3','Bb4'], summary:'Black pins the c3-knight and fights for central control, often accepting structural imbalances.', ideas:['Use the pin to pressure e4.','Be ready to exchange the bishop for a knight.','Play against White’s pawn structure and central space.'] },
];

export const fundamentals = [
  { title:'Fight for the center', level:'Foundation', body:'Central squares give your pieces more routes and influence. Start by contesting e4, d4, e5, and d5 with pawns and pieces.' },
  { title:'Develop with purpose', level:'Foundation', body:'Bring knights and bishops into the game before making repeated moves with the same piece. Development creates options and protects your king.' },
  { title:'King safety matters', level:'Foundation', body:'Castling usually connects your rooks and moves your king away from the center. Do not delay it without a concrete reason.' },
  { title:'Do not give pieces away', level:'Foundation', body:'Before every move, ask what your opponent attacks and what your move leaves undefended. Scan checks, captures, and threats.' },
  { title:'Calculate forcing moves', level:'Intermediate', body:'Checks, captures, and direct threats narrow the opponent’s choices. Calculate the most forcing candidate moves first.' },
  { title:'Improve your worst piece', level:'Intermediate', body:'When there is no tactic, identify your least active piece and find a better square. Small improvements often create a lasting advantage.' },
];
