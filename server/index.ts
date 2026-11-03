import 'dotenv/config';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Chess, type Square } from 'chess.js';
import { Server, type Socket } from 'socket.io';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || !token) return next(new Error('Authentication required.'));
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    socket.data.uid = decoded.uid;
    next();
  } catch {
    next(new Error('Invalid or expired account session.'));
  }
});

io.on('connection', (socket: PlayerSocket) => {
  socket.emit('server:ready', { uid: socket.data.uid });

  socket.on('queue:join', (payload: { timeControl?: unknown } = {}) => {
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
    if (color === 'w') room.whiteTimeMs -= elapsed; else room.blackTimeMs -= elapsed;
    if ((color === 'w' ? room.whiteTimeMs : room.blackTimeMs) <= 0) {
      room.status = 'finished';
      io.to(room.id).emit('game:ended', {
        result: color === 'w' ? 'black-wins' : 'white-wins',
        reason: 'timeout',
        whiteTimeMs: Math.max(0, room.whiteTimeMs),
        blackTimeMs: Math.max(0, room.blackTimeMs),
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
      if (color === 'w') room.whiteTimeMs += room.incrementMs; else room.blackTimeMs += room.incrementMs;
      room.lastMoveAt = Date.now();
      if (room.chess.isGameOver()) room.status = 'finished';
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
    io.to(room.id).emit('game:ended', { result: 'draw', reason: 'agreement', pgn: room.chess.pgn() });
  });

  socket.on('game:resign', (payload: { gameId?: unknown }) => {
    const room = typeof payload.gameId === 'string' ? games.get(payload.gameId) : undefined;
    const uid = socket.data.uid as string;
    const color = room ? getPlayerColor(room, uid) : null;
    if (!room || room.status !== 'active' || !color) return sendError(socket, 'Cannot resign from this game.');
    room.status = 'finished';
    io.to(room.id).emit('game:ended', {
      result: color === 'w' ? 'black-wins' : 'white-wins',
      reason: 'resignation',
      pgn: room.chess.pgn(),
    });
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
      if (room.status !== 'active' || !getPlayerColor(room, uid)) continue;
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
          io.to(room.id).emit('game:ended', { result, reason: 'disconnect-timeout', pgn: room.chess.pgn() });
          disconnectTimers.delete(room.id);
        }, 60_000);
        disconnectTimers.set(room.id, timer);
      }
    }
  });
});

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'checkmate-realtime', activeGames: games.size, queuedPlayers: queues.size });
});

const port = Number(process.env.PORT || 4000);
server.listen(port, () => {
  console.log(`CHECKMATE realtime server listening on :${port}`);
});
