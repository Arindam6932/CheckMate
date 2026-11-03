import 'dotenv/config';
import { createServer } from 'node:http';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Chess, type Square } from 'chess.js';
import { Server, type Socket } from 'socket.io';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

type PlayerSocket = Socket;
type TimeControl = '3+0' | '5+0' | '10+0' | '15+10' | '30+0';
type GameRoom = {
  id: string;
  whiteUid: string;
  blackUid: string;
  chess: Chess;
  timeControl: TimeControl;
  status: 'active' | 'finished';
  drawOfferBy: string | null;
  createdAt: number;
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  lastMoveAt: number | null;
  paused: boolean;
  disconnectedUids: Set<string>;
  callParticipants: Set<string>;
};

const app = express();
const server = createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '16kb' }));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const adminApp = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const firebaseAuth = getAuth(adminApp);
const firestore = getFirestore(adminApp);

const games = new Map<string, GameRoom>();
const queues = new Map<TimeControl, string>();
const privateInvites = new Map<string, { socketId: string; timeControl: TimeControl; expiresAt: number }>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const validControls: TimeControl[] = ['3+0', '5+0', '10+0', '15+10', '30+0'];

function validTimeControl(value: unknown): value is TimeControl {
  return typeof value === 'string' && validControls.includes(value as TimeControl);
}

function removeFromQueue(socketId: string) {
  for (const [control, waitingSocket] of queues.entries()) {
    if (waitingSocket === socketId) queues.delete(control);
  }
}

function emitGameStart(white: PlayerSocket, black: PlayerSocket, timeControl: TimeControl, inviteCode?: string) {
  const id = randomUUID();
  const [minutes, increment] = timeControl.split('+').map(Number);
  const initialTime = minutes * 60_000;
  const room: GameRoom = {
    id,
    whiteUid: white.data.uid as string,
    blackUid: black.data.uid as string,
    chess: new Chess(),
    timeControl,
    status: 'active',
    drawOfferBy: null,
    createdAt: Date.now(),
    whiteTimeMs: initialTime,
    blackTimeMs: initialTime,
    incrementMs: increment * 1_000,
    lastMoveAt: Date.now(),
    paused: false,
    disconnectedUids: new Set<string>(),
    callParticipants: new Set<string>(),
  };
  games.set(id, room);
  white.join(id);
  black.join(id);
  const base = { gameId: id, fen: room.chess.fen(), pgn: '', timeControl, inviteCode, whiteTimeMs: room.whiteTimeMs, blackTimeMs: room.blackTimeMs, turn: 'w' };
  white.emit('match:found', { ...base, color: 'w', opponentUid: room.blackUid });
  black.emit('match:found', { ...base, color: 'b', opponentUid: room.whiteUid });
}

function getPlayerColor(room: GameRoom, uid: string): 'w' | 'b' | null {
  if (room.whiteUid === uid) return 'w';
  if (room.blackUid === uid) return 'b';
  return null;
}

function sendError(socket: PlayerSocket, message: string) {
  socket.emit('game:error', { message });
}

function allowRate(socket: PlayerSocket, event: string, maximum: number, windowMs: number): boolean {
  const now = Date.now();
  const buckets = (socket.data.rateBuckets ||= new Map<string, { count: number; resetAt: number }>());
  const bucket = buckets.get(event);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(event, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maximum) return false;
  bucket.count += 1;
  return true;
}

async function persistGame(room: GameRoom, result: string, reason: string) {
  const [minutes] = room.timeControl.split('+').map(Number);
  const category = minutes >= 30 ? 'classical' : minutes >= 10 ? 'rapid' : 'blitz';
  const scoreWhite = result === 'white-wins' ? 1 : result === 'black-wins' ? 0 : 0.5;
  const scoreBlack = 1 - scoreWhite;
  const gameRef = firestore.collection('games').doc(room.id);
  const whiteRef = firestore.collection('players').doc(room.whiteUid);
  const blackRef = firestore.collection('players').doc(room.blackUid);
  const whitePublicRef = firestore.collection('publicProfiles').doc(room.whiteUid);
  const blackPublicRef = firestore.collection('publicProfiles').doc(room.blackUid);

  try {
    await firestore.runTransaction(async transaction => {
      const [existing, whiteSnapshot, blackSnapshot] = await Promise.all([
        transaction.get(gameRef),
        transaction.get(whiteRef),
        transaction.get(blackRef),
      ]);
      if (existing.exists) return;

      const whiteData = whiteSnapshot.data() || {};
      const blackData = blackSnapshot.data() || {};
      const whiteRatings = (whiteData.ratings || {}) as Record<string, number>;
      const blackRatings = (blackData.ratings || {}) as Record<string, number>;
      const whiteStats = (whiteData.stats || {}) as Record<string, number>;
      const blackStats = (blackData.stats || {}) as Record<string, number>;
      const whiteBefore = Number(whiteRatings[category] ?? 1500);
      const blackBefore = Number(blackRatings[category] ?? 1500);
      const expectedWhite = 1 / (1 + Math.pow(10, (blackBefore - whiteBefore) / 400));
      const expectedBlack = 1 - expectedWhite;
      const whiteDelta = Math.round(32 * (scoreWhite - expectedWhite));
      const blackDelta = Math.round(32 * (scoreBlack - expectedBlack));
      const whiteAfter = whiteBefore + whiteDelta;
      const blackAfter = blackBefore + blackDelta;

      const nextStats = (stats: Record<string, number>, score: number) => ({
        gamesPlayed: Number(stats.gamesPlayed || 0) + 1,
        wins: Number(stats.wins || 0) + (score === 1 ? 1 : 0),
        draws: Number(stats.draws || 0) + (score === 0.5 ? 1 : 0),
        losses: Number(stats.losses || 0) + (score === 0 ? 1 : 0),
      });

      const whiteNextStats = nextStats(whiteStats, scoreWhite);
      const blackNextStats = nextStats(blackStats, scoreBlack);
      const finishedAt = FieldValue.serverTimestamp();

      transaction.set(gameRef, {
        gameId: room.id,
        whiteUid: room.whiteUid,
        blackUid: room.blackUid,
        timeControl: room.timeControl,
        ratingCategory: category,
        result,
        reason,
        pgn: room.chess.pgn(),
        finalFen: room.chess.fen(),
        moveCount: room.chess.history().length,
        whiteRatingBefore: whiteBefore,
        whiteRatingAfter: whiteAfter,
        blackRatingBefore: blackBefore,
        blackRatingAfter: blackAfter,
        startedAt: Timestamp.fromMillis(room.createdAt),
        finishedAt,
      });
      transaction.set(whiteRef, {
        ratings: { [category]: whiteAfter },
        stats: whiteNextStats,
        updatedAt: finishedAt,
      }, { merge: true });
      transaction.set(blackRef, {
        ratings: { [category]: blackAfter },
        stats: blackNextStats,
        updatedAt: finishedAt,
      }, { merge: true });
      transaction.set(whitePublicRef, {
        ratings: { [category]: whiteAfter },
        stats: whiteNextStats,
        updatedAt: finishedAt,
      }, { merge: true });
      transaction.set(blackPublicRef, {
        ratings: { [category]: blackAfter },
        stats: blackNextStats,
        updatedAt: finishedAt,
      }, { merge: true });
    });
  } catch (error) {
    console.error('Could not persist completed game and ratings:', error);
  }
}

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || !token) return next(new Error('Authentication required.'));
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    if (decoded.email_verified !== true) return next(new Error('Verify your email address before playing online.'));
    socket.data.uid = decoded.uid;
    next();
  } catch {
    next(new Error('Invalid or expired account session.'));
  }
});

io.on('connection', (socket: PlayerSocket) => {
  socket.emit('server:ready', { uid: socket.data.uid });

  socket.on('queue:join', (payload: { timeControl?: unknown } = {}) => {
    if (!allowRate(socket, 'queue:join', 12, 60_000)) return sendError(socket, 'Too many matchmaking requests. Please wait a moment.');
    const control = payload.timeControl;
    if (!validTimeControl(control)) return sendError(socket, 'Choose a supported time control.');
    removeFromQueue(socket.id);
    const waitingId = queues.get(control);
    const opponent = waitingId ? io.sockets.sockets.get(waitingId) : undefined;

    if (opponent?.connected && opponent.data.uid !== socket.data.uid) {
      queues.delete(control);
      emitGameStart(opponent, socket, control);
      return;
    }
    queues.set(control, socket.id);
    socket.emit('queue:waiting', { timeControl: control });
  });

  socket.on('queue:leave', () => {
    removeFromQueue(socket.id);
    socket.emit('queue:left');
  });

  socket.on('private:create', (payload: { timeControl?: unknown } = {}) => {
    if (!allowRate(socket, 'private:create', 5, 60_000)) return sendError(socket, 'Too many private invitations. Please wait before creating another.');
    const control = validTimeControl(payload.timeControl) ? payload.timeControl : '10+0';
    const code = randomBytes(4).toString('hex').toUpperCase();
    privateInvites.set(code, { socketId: socket.id, timeControl: control, expiresAt: Date.now() + 10 * 60_000 });
    socket.emit('private:created', { code, timeControl: control });
  });

  socket.on('private:join', (payload: { code?: unknown }) => {
    const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : '';
    const invite = privateInvites.get(code);
    const host = invite ? io.sockets.sockets.get(invite.socketId) : undefined;
    if (!invite || invite.expiresAt < Date.now() || !host?.connected) {
      privateInvites.delete(code);
      return sendError(socket, 'That private game code is invalid or expired.');
    }
    if (host.data.uid === socket.data.uid) return sendError(socket, 'You cannot join your own invitation.');
    privateInvites.delete(code);
    emitGameStart(host, socket, invite.timeControl, code);
  });

  socket.on('game:move', (payload: { gameId?: unknown; from?: unknown; to?: unknown; promotion?: unknown }) => {
    const gameId = typeof payload.gameId === 'string' ? payload.gameId : '';
    const room = games.get(gameId);
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !socket.rooms.has(gameId)) return sendError(socket, 'Game session is not active.');
    const color = getPlayerColor(room, uid);
    if (!color) return sendError(socket, 'You are not a player in this game.');
    if (room.paused || room.lastMoveAt === null) return sendError(socket, 'The game clock is paused while a player reconnects.');
    if (room.chess.turn() !== color) return sendError(socket, 'It is not your turn.');
    const now = Date.now();
    const elapsed = now - room.lastMoveAt;
    const remainingAfterElapsed = (color === 'w' ? room.whiteTimeMs : room.blackTimeMs) - elapsed;
    if (remainingAfterElapsed <= 0) {
      if (color === 'w') room.whiteTimeMs = 0; else room.blackTimeMs = 0;
      room.status = 'finished';
      void persistGame(room, color === 'w' ? 'black-wins' : 'white-wins', 'timeout');
      io.to(room.id).emit('game:ended', {
        result: color === 'w' ? 'black-wins' : 'white-wins',
        reason: 'timeout',
        whiteTimeMs: room.whiteTimeMs,
        blackTimeMs: room.blackTimeMs,
        pgn: room.chess.pgn(),
      });
      return;
    }
    if (typeof payload.from !== 'string' || typeof payload.to !== 'string' || !/^[a-h][1-8]$/.test(payload.from) || !/^[a-h][1-8]$/.test(payload.to)) {
      return sendError(socket, 'Invalid board coordinates.');
    }
    const promotion = ['q', 'r', 'b', 'n'].includes(String(payload.promotion)) ? String(payload.promotion) as 'q' | 'r' | 'b' | 'n' : undefined;
    try {
      const move = room.chess.move({ from: payload.from as Square, to: payload.to as Square, ...(promotion ? { promotion } : {}) });
      if (room.drawOfferBy && room.drawOfferBy !== uid) {
        room.drawOfferBy = null;
        socket.to(room.id).emit('game:draw-declined');
      }
      if (color === 'w') room.whiteTimeMs = remainingAfterElapsed + room.incrementMs;
      else room.blackTimeMs = remainingAfterElapsed + room.incrementMs;
      room.lastMoveAt = Date.now();
      if (room.chess.isGameOver()) {
        room.status = 'finished';
        const result = room.chess.isDraw() ? 'draw' : color === 'w' ? 'white-wins' : 'black-wins';
        void persistGame(room, result, room.chess.isCheckmate() ? 'checkmate' : 'draw');
      }
      io.to(gameId).emit('game:state', {
        gameId,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        lastMove: { from: move.from, to: move.to, san: move.san, color: move.color },
        turn: room.chess.turn(),
        check: room.chess.isCheck(),
        checkmate: room.chess.isCheckmate(),
        draw: room.chess.isDraw(),
        gameOver: room.chess.isGameOver(),
        whiteTimeMs: room.whiteTimeMs,
        blackTimeMs: room.blackTimeMs,
        serverTime: Date.now(),
        paused: room.paused,
      });
    } catch {
      sendError(socket, 'That move is not legal.');
    }
  });

  socket.on('game:reconnect', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !getPlayerColor(room, uid)) return sendError(socket, 'This game cannot be rejoined.');
    socket.join(room.id);
    room.disconnectedUids.delete(uid);
    if (room.disconnectedUids.size === 0) {
      const timer = disconnectTimers.get(room.id);
      if (timer) clearTimeout(timer);
      disconnectTimers.delete(room.id);
      room.paused = false;
      room.lastMoveAt = Date.now();
      socket.to(room.id).emit('game:opponent-reconnected');
    }
    socket.emit('game:state', {
      gameId: room.id, fen: room.chess.fen(), pgn: room.chess.pgn(),
      turn: room.chess.turn(), check: room.chess.isCheck(),
      checkmate: room.chess.isCheckmate(), draw: room.chess.isDraw(),
      gameOver: room.chess.isGameOver(), whiteTimeMs: room.whiteTimeMs,
      blackTimeMs: room.blackTimeMs, serverTime: Date.now(), paused: room.paused,
    });
  });

  socket.on('game:offer-draw', (payload: { gameId?: unknown }) => {
    if (!allowRate(socket, 'game:offer-draw', 5, 60_000)) return sendError(socket, 'Please wait before offering another draw.');
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !getPlayerColor(room, uid)) return sendError(socket, 'Cannot offer a draw in this game.');
    room.drawOfferBy = uid;
    socket.to(room.id).emit('game:draw-offered', { from: uid });
  });

  socket.on('game:decline-draw', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !getPlayerColor(room, uid)) return sendError(socket, 'Cannot respond to this draw offer.');
    if (!room.drawOfferBy || room.drawOfferBy === uid) return sendError(socket, 'There is no opponent draw offer to decline.');
    room.drawOfferBy = null;
    socket.to(room.id).emit('game:draw-declined');
  });

  socket.on('game:accept-draw', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !room.drawOfferBy || room.drawOfferBy === uid || !getPlayerColor(room, uid)) {
      return sendError(socket, 'There is no draw offer to accept.');
    }
    room.status = 'finished';
    void persistGame(room, 'draw', 'agreement');
    io.to(room.id).emit('game:ended', { result: 'draw', reason: 'agreement', pgn: room.chess.pgn() });
  });

  socket.on('game:resign', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    const color = room ? getPlayerColor(room, uid) : null;
    if (!room || room.status !== 'active' || !color) return sendError(socket, 'Cannot resign from this game.');
    room.status = 'finished';
    void persistGame(room, color === 'w' ? 'black-wins' : 'white-wins', 'resignation');
    io.to(room.id).emit('game:ended', {
      result: color === 'w' ? 'black-wins' : 'white-wins',
      reason: 'resignation',
      pgn: room.chess.pgn(),
    });
  });

  socket.on('call:join', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || room.status !== 'active' || !getPlayerColor(room, uid)) return sendError(socket, 'In-game calls are available only to the two active players.');
    if (room.callParticipants.has(uid)) return sendError(socket, 'You are already connected to this private call.');
    if (room.callParticipants.size >= 2) return sendError(socket, 'This private call already has two players.');
    const initiator = room.callParticipants.size === 0;
    room.callParticipants.add(uid);
    socket.emit('call:ready', { gameId: room.id, initiator });
    socket.to(room.id).emit('call:peer-joined');
  });

  socket.on('call:signal', (payload: { gameId?: unknown; signal?: unknown }) => {
    if (!allowRate(socket, 'call:signal', 40, 10_000)) return sendError(socket, 'Too many call signaling messages.');
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || !room.callParticipants.has(uid) || !getPlayerColor(room, uid)) return sendError(socket, 'You are not a participant in this private call.');
    if (!payload.signal || typeof payload.signal !== 'object' || JSON.stringify(payload.signal).length > 65_536) {
      return sendError(socket, 'Invalid call signal.');
    }
    socket.to(room.id).emit('call:signal', { signal: payload.signal });
  });

  socket.on('call:leave', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    if (!room || !room.callParticipants.has(uid)) return;
    room.callParticipants.delete(uid);
    socket.to(room.id).emit('call:peer-left');
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    for (const [code, invite] of privateInvites.entries()) {
      if (invite.socketId === socket.id) privateInvites.delete(code);
    }
    const uid = socket.data.uid as string;
    const anotherSession = [...io.sockets.sockets.values()].some(candidate => candidate.data.uid === uid);
    if (anotherSession) return;
    for (const room of games.values()) {
      if (!getPlayerColor(room, uid)) continue;
      if (room.callParticipants.delete(uid)) socket.to(room.id).emit('call:peer-left');
      if (room.status !== 'active') continue;
      room.disconnectedUids.add(uid);
      room.paused = true;
      room.lastMoveAt = null;
      socket.to(room.id).emit('game:opponent-disconnected');
      if (!disconnectTimers.has(room.id)) {
        const timer = setTimeout(() => {
          if (room.status !== 'active' || room.disconnectedUids.size === 0) return;
          room.status = 'finished';
          const disconnected = [...room.disconnectedUids];
          const result = disconnected.length > 1 ? 'draw' : disconnected[0] === room.whiteUid ? 'black-wins' : 'white-wins';
          void persistGame(room, result, 'disconnect-timeout');
          io.to(room.id).emit('game:ended', { result, reason: 'disconnect-timeout', pgn: room.chess.pgn() });
          disconnectTimers.delete(room.id);
        }, 60_000);
        disconnectTimers.set(room.id, timer);
      }
    }
  });
});


async function verifiedHttpUid(request: express.Request, response: express.Response): Promise<string | null> {
  const authorization = request.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) { response.status(401).json({ error: 'Authentication required.' }); return null; }
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    if (decoded.email_verified !== true) { response.status(403).json({ error: 'Verify your email address first.' }); return null; }
    return decoded.uid;
  } catch {
    response.status(401).json({ error: 'Invalid or expired account session.' });
    return null;
  }
}

app.post('/tournaments/:tournamentId/register', async (request, response) => {
  const uid = await verifiedHttpUid(request, response);
  if (!uid) return;
  const tournamentId = String(request.params.tournamentId || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tournamentId)) return response.status(400).json({ error: 'Invalid tournament ID.' });
  try {
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const participantRef = tournamentRef.collection('participants').doc(uid);
    const participantsQuery = tournamentRef.collection('participants');
    const profileRef = firestore.collection('publicProfiles').doc(uid);
    const outcome = await firestore.runTransaction(async transaction => {
      const [tournamentSnapshot, participantSnapshot, participantsSnapshot, profileSnapshot] = await Promise.all([
        transaction.get(tournamentRef), transaction.get(participantRef),
        transaction.get(participantsQuery), transaction.get(profileRef),
      ]);
      if (!tournamentSnapshot.exists) return { status: 404, error: 'Tournament not found.' };
      const tournament = tournamentSnapshot.data()!;
      if (participantSnapshot.exists) return { status: 200, alreadyJoined: true, count: participantsSnapshot.size };
      if (tournament.status !== 'open') return { status: 409, error: 'Registration is closed.' };
      if (!(tournament.startsAt instanceof Timestamp) || tournament.startsAt.toMillis() <= Date.now()) {
        return { status: 409, error: 'This tournament has already started.' };
      }
      const capacity = Number(tournament.capacity);
      const currentCount = Number.isInteger(tournament.participantCount)
        ? Number(tournament.participantCount) : participantsSnapshot.size;
      if (!Number.isInteger(capacity) || capacity < 2 || currentCount >= capacity) {
        return { status: 409, error: 'This tournament is full.' };
      }
      const profile = profileSnapshot.data() || {};
      const displayName = typeof profile.displayName === 'string' ? profile.displayName.slice(0, 30) : 'CHECKMATE player';
      transaction.create(participantRef, { uid, displayName, joinedAt: FieldValue.serverTimestamp() });
      transaction.update(tournamentRef, { participantCount: currentCount + 1 });
      return { status: 201, alreadyJoined: false, count: currentCount + 1 };
    });
    const { status, ...body } = outcome;
    response.status(status).json(body);
  } catch (error) {
    console.error('Tournament registration failed:', error);
    response.status(500).json({ error: 'Could not complete tournament registration.' });
  }
});

app.delete('/tournaments/:tournamentId/register', async (request, response) => {
  const uid = await verifiedHttpUid(request, response);
  if (!uid) return;
  const tournamentId = String(request.params.tournamentId || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tournamentId)) return response.status(400).json({ error: 'Invalid tournament ID.' });
  try {
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const participantRef = tournamentRef.collection('participants').doc(uid);
    const outcome = await firestore.runTransaction(async transaction => {
      const [tournamentSnapshot, participantSnapshot] = await Promise.all([
        transaction.get(tournamentRef), transaction.get(participantRef),
      ]);
      if (!tournamentSnapshot.exists) return { status: 404, error: 'Tournament not found.' };
      if (!participantSnapshot.exists) return { status: 200, withdrawn: false };
      const tournament = tournamentSnapshot.data()!;
      if (tournament.startsAt instanceof Timestamp && tournament.startsAt.toMillis() <= Date.now()) {
        return { status: 409, error: 'You cannot withdraw after the tournament has started.' };
      }
      const participantsSnapshot = await transaction.get(tournamentRef.collection('participants'));
      const currentCount = Number.isInteger(tournament.participantCount)
        ? Number(tournament.participantCount) : participantsSnapshot.size;
      transaction.delete(participantRef);
      transaction.update(tournamentRef, { participantCount: Math.max(0, currentCount - 1) });
      return { status: 200, withdrawn: true, count: Math.max(0, currentCount - 1) };
    });
    const { status, ...body } = outcome;
    response.status(status).json(body);
  } catch (error) {
    console.error('Tournament withdrawal failed:', error);
    response.status(500).json({ error: 'Could not withdraw from this tournament.' });
  }
});

app.post('/tournaments/:tournamentId/close', async (request, response) => {
  const uid = await verifiedHttpUid(request, response);
  if (!uid) return;
  const tournamentId = String(request.params.tournamentId || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(tournamentId)) return response.status(400).json({ error: 'Invalid tournament ID.' });
  try {
    const tournamentRef = firestore.collection('tournaments').doc(tournamentId);
    const outcome = await firestore.runTransaction(async transaction => {
      const snapshot = await transaction.get(tournamentRef);
      if (!snapshot.exists) return { status: 404, error: 'Tournament not found.' };
      if (snapshot.data()?.createdBy !== uid) return { status: 403, error: 'Only the tournament organizer can close registration.' };
      if (snapshot.data()?.status !== 'open') return { status: 409, error: 'Registration is already closed.' };
      transaction.update(tournamentRef, { status: 'closed' });
      return { status: 200, closed: true };
    });
    const { status, ...body } = outcome;
    response.status(status).json(body);
  } catch (error) {
    console.error('Tournament close failed:', error);
    response.status(500).json({ error: 'Could not close tournament registration.' });
  }
});

app.get('/ice-servers', async (request, response) => {
  const authorization = request.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: 'Authentication required.' });
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    if (decoded.email_verified !== true) return response.status(403).json({ error: 'Verified email required.' });
    const iceServers: Array<Record<string, unknown>> = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnUrl = process.env.TURN_URL;
    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (turnUrl && sharedSecret) {
      const expiry = Math.floor(Date.now() / 1000) + 60 * 60;
      const username = `${expiry}:${decoded.uid}`;
      const credential = createHmac('sha1', sharedSecret).update(username).digest('base64');
      iceServers.push({ urls: turnUrl.split(',').map(value => value.trim()), username, credential });
    }
    response.json({ iceServers, expiresIn: 3600 });
  } catch {
    response.status(401).json({ error: 'Invalid or expired account session.' });
  }
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'checkmate-realtime', activeGames: games.size, queuedPlayers: queues.size });
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`CHECKMATE realtime server listening on :${port}`);
});
